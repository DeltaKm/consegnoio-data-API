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

const assignRaiderSchema = z.object({
  raiderId: z.string(),
  businessIds: z.array(z.string()).min(1),
});

// POST - Assegna raider ai business (Admin può assegnare qualsiasi raider a qualsiasi business)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
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

    // Verifica che raider esista
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      select: {
        id: true,
        bussinesActived: true,
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che tutti i business esistano
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true }
    });

    if (businesses.length !== businessIds.length) {
      const foundIds = businesses.map(b => b.id);
      const notFound = businessIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { 
          message: "Alcuni business non esistono",
          notFoundBusinessIds: notFound
        },
        { status: StatusCodes.NotFound }
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
            confirmedFromBusiness: true, // Admin assegna già confermato
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

// PATCH - Sincronizza assegnazioni raider (rimuove vecchie, aggiunge nuove)
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
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

    // Verifica che raider esista
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        businessRelations: {
          select: {
            businessId: true,
          }
        }
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che tutti i business esistano
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true }
    });

    if (businesses.length !== businessIds.length) {
      const foundIds = businesses.map(b => b.id);
      const notFound = businessIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { 
          message: "Alcuni business non esistono",
          notFoundBusinessIds: notFound
        },
        { status: StatusCodes.NotFound }
      );
    }

    // Calcola business da aggiungere e rimuovere
    const currentBusinessIds = raider.businessRelations.map(rel => rel.businessId);
    const businessToAdd = businessIds.filter(id => !currentBusinessIds.includes(id));
    const businessToRemove = currentBusinessIds.filter(id => !businessIds.includes(id));

    // Sincronizza in transazione con timeout maggiore
    await prisma.$transaction(async (tx) => {
      // 1. Rimuovi relazioni vecchie
      if (businessToRemove.length > 0) {
        await tx.businessRaider.deleteMany({
          where: {
            raiderId: raiderId,
            businessId: { in: businessToRemove }
          }
        });
      }

      // 2. Aggiungi nuove relazioni
      if (businessToAdd.length > 0) {
        for (const businessId of businessToAdd) {
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
              confirmedFromBusiness: true,
            }
          });
        }
      }

      // 3. Aggiorna array bussinesActived nel Raider
      await tx.raider.update({
        where: { id: raiderId },
        data: {
          bussinesActived: businessIds,
        }
      });

      // 4. Aggiorna array raiderActived nei business (batch)
      // Rimuovi raider dai business rimossi
      if (businessToRemove.length > 0) {
        const businessesToUpdate = await tx.business.findMany({
          where: { id: { in: businessToRemove } },
          select: { id: true, raiderActived: true }
        });

        for (const business of businessesToUpdate) {
          const newRaiderActived = business.raiderActived.filter(id => id !== raiderId);
          await tx.business.update({
            where: { id: business.id },
            data: { raiderActived: newRaiderActived }
          });
        }
      }

      // Aggiungi raider ai nuovi business
      if (businessToAdd.length > 0) {
        const businessesToUpdate = await tx.business.findMany({
          where: { id: { in: businessToAdd } },
          select: { id: true, raiderActived: true }
        });

        for (const business of businessesToUpdate) {
          const newRaiderActived = Array.from(new Set([
            ...business.raiderActived,
            raiderId
          ]));
          await tx.business.update({
            where: { id: business.id },
            data: { raiderActived: newRaiderActived }
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return NextResponse.json(
      {
        message: "Assegnazioni raider sincronizzate con successo",
        raiderId,
        currentBusinessIds: businessIds,
        added: businessToAdd.length,
        removed: businessToRemove.length,
        details: {
          addedBusinessIds: businessToAdd,
          removedBusinessIds: businessToRemove,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore sincronizzazione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
