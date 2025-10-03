import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

const assignRaiderSchema = z.object({
  raiderId: z.string(),
  businessIds: z.array(z.string()).min(1),
});

// POST - Assegna raider ai business
export async function POST(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();

    // Validazione
    const validation = assignRaiderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { raiderId, businessIds } = validation.data;

    // Verifica che raider esista e sia creato da questo logistics
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      select: {
        id: true,
        createdByLogisticsId: true,
        bussinesActived: true,
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica permessi: Logistics può assegnare solo raider creati da lui
    if (raider.createdByLogisticsId !== auth.logistics.id) {
      return NextResponse.json(
        { message: "Non hai i permessi per assegnare questo raider" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Verifica che tutti i business siano assegnati a questo logistics
    const assignedBusinessIds = auth.logistics.businessRelations.map(rel => rel.businessId);
    const invalidBusinessIds = businessIds.filter(id => !assignedBusinessIds.includes(id));

    if (invalidBusinessIds.length > 0) {
      return NextResponse.json(
        { 
          message: "Alcuni business non sono assegnati a questo logistics",
          invalidBusinessIds 
        },
        { status: StatusCodes.Forbidden }
      );
    }

    // Assegna raider ai business in transazione
    await prisma.$transaction(async (tx) => {
      // 1. Crea relazioni BusinessRaider
      for (const businessId of businessIds) {
        await tx.businessRaider.upsert({
          where: {
            businessId_raiderId: {
              businessId,
              raiderId,
            }
          },
          update: {},
          create: {
            businessId,
            raiderId,
            confirmedFromBusiness: true, // Logistics assegna già confermato
          }
        });
      }

      // 2. Aggiorna array bussinesActived nel Raider
      const newBussinesActived = Array.from(new Set([
        ...raider.bussinesActived,
        ...businessIds
      ]));

      await tx.raider.update({
        where: { id: raiderId },
        data: {
          bussinesActived: newBussinesActived,
        }
      });

      // 3. Aggiorna array raiderActived nei Business
      for (const businessId of businessIds) {
        const business = await tx.business.findUnique({
          where: { id: businessId },
          select: { raiderActived: true }
        });

        if (business) {
          const newRaiderActived = Array.from(new Set([
            ...business.raiderActived,
            raiderId
          ]));

          await tx.business.update({
            where: { id: businessId },
            data: {
              raiderActived: newRaiderActived,
            }
          });
        }
      }
    });

    return NextResponse.json(
      {
        message: `Raider assegnato a ${businessIds.length} business con successo`,
        raiderId,
        assignedBusinessIds: businessIds,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore assegnazione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
