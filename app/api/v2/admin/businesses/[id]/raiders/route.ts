import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

const syncRaidersSchema = z.object({
  raiderIds: z.array(z.string()),
});

// PATCH - Sincronizza i raider collegati a questo business (visto dal lato Business)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const businessId = params.id;
    const body = await request.json();

    const validation = syncRaidersSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { raiderIds } = validation.data;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        raiderRelations: { select: { raiderId: true } }
      }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (raiderIds.length > 0) {
      const raiders = await prisma.raider.findMany({
        where: { id: { in: raiderIds } },
        select: { id: true }
      });

      if (raiders.length !== raiderIds.length) {
        const foundIds = raiders.map(r => r.id);
        const notFound = raiderIds.filter(id => !foundIds.includes(id));
        return NextResponse.json(
          {
            message: "Alcuni raider non esistono",
            notFoundRaiderIds: notFound
          },
          { status: StatusCodes.NotFound }
        );
      }
    }

    const currentRaiderIds = business.raiderRelations.map(rel => rel.raiderId);
    const raidersToAdd = raiderIds.filter(id => !currentRaiderIds.includes(id));
    const raidersToRemove = currentRaiderIds.filter(id => !raiderIds.includes(id));

    await prisma.$transaction(async (tx) => {
      if (raidersToRemove.length > 0) {
        await tx.businessRaider.deleteMany({
          where: {
            businessId,
            raiderId: { in: raidersToRemove }
          }
        });
      }

      if (raidersToAdd.length > 0) {
        for (const raiderId of raidersToAdd) {
          await tx.businessRaider.upsert({
            where: {
              businessId_raiderId: { businessId, raiderId }
            },
            update: {},
            create: {
              businessId,
              raiderId,
              confirmedFromBusiness: true,
            }
          });
        }
      }
    });

    // Aggiorna gli array denormalizzati fuori dalla transazione (best-effort,
    // stesso approccio di /v2/admin/raiders/assign)
    try {
      await prisma.business.update({
        where: { id: businessId },
        data: { raiderActived: raiderIds }
      });

      if (raidersToRemove.length > 0) {
        const raidersToUpdate = await prisma.raider.findMany({
          where: { id: { in: raidersToRemove } },
          select: { id: true, bussinesActived: true }
        });
        for (const raider of raidersToUpdate) {
          await prisma.raider.update({
            where: { id: raider.id },
            data: { bussinesActived: raider.bussinesActived.filter((id) => id !== businessId) }
          });
        }
      }

      if (raidersToAdd.length > 0) {
        const raidersToUpdate = await prisma.raider.findMany({
          where: { id: { in: raidersToAdd } },
          select: { id: true, bussinesActived: true }
        });
        for (const raider of raidersToUpdate) {
          await prisma.raider.update({
            where: { id: raider.id },
            data: {
              bussinesActived: Array.from(new Set([...raider.bussinesActived, businessId]))
            }
          });
        }
      }
    } catch (arrayUpdateError) {
      console.error("Errore aggiornamento array (non critico):", arrayUpdateError);
    }

    return NextResponse.json(
      {
        message: "Raider sincronizzati con successo",
        businessId,
        currentRaiderIds: raiderIds,
        added: raidersToAdd.length,
        removed: raidersToRemove.length,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore sincronizzazione raider del business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
