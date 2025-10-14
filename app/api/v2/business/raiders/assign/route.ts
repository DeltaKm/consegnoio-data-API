import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

const assignRaiderSchema = z.object({
  raiderIds: z.array(z.string()).min(1),
});

// POST - Assegna raiders al business
export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
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

    const { raiderIds } = validation.data;

    // Verifica che tutti i raider esistano
    const raiders = await prisma.raider.findMany({
      where: { id: { in: raiderIds } },
      select: { id: true, bussinesActived: true }
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

    // Assegna raiders al business in transazione
    await prisma.$transaction(async (tx) => {
      // 1. Crea relazioni BusinessRaider
      for (const raiderId of raiderIds) {
        await tx.businessRaider.upsert({
          where: {
            businessId_raiderId: {
              businessId: auth.business.id,
              raiderId,
            }
          },
          update: {},
          create: {
            businessId: auth.business.id,
            raiderId,
            confirmedFromBusiness: true,
          }
        });
      }

      // 2. Aggiorna array raiderActived nel Business
      const newRaiderActived = Array.from(new Set([
        ...auth.business.raiderActived,
        ...raiderIds
      ]));

      await tx.business.update({
        where: { id: auth.business.id },
        data: {
          raiderActived: newRaiderActived,
        }
      });

      // 3. Aggiorna array bussinesActived nei Raider
      for (const raiderId of raiderIds) {
        const raider = await tx.raider.findUnique({
          where: { id: raiderId },
          select: { bussinesActived: true }
        });

        if (raider) {
          const newBussinesActived = Array.from(new Set([
            ...raider.bussinesActived,
            auth.business.id
          ]));

          await tx.raider.update({
            where: { id: raiderId },
            data: {
              bussinesActived: newBussinesActived,
            }
          });
        }
      }
    });

    return NextResponse.json(
      {
        message: `${raiderIds.length} raider assegnati con successo`,
        businessId: auth.business.id,
        assignedRaiderIds: raiderIds,
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

// PATCH - Sincronizza raiders del business (rimuove vecchi, aggiunge nuovi)
export async function PATCH(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
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

    const { raiderIds } = validation.data;

    // Verifica che tutti i raider esistano
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

    // Ottieni raider attuali del business
    const currentRelations = await prisma.businessRaider.findMany({
      where: { businessId: auth.business.id },
      select: { raiderId: true }
    });

    const currentRaiderIds = currentRelations.map(rel => rel.raiderId);
    const raidersToAdd = raiderIds.filter(id => !currentRaiderIds.includes(id));
    const raidersToRemove = currentRaiderIds.filter(id => !raiderIds.includes(id));

    // Sincronizza in transazione
    await prisma.$transaction(async (tx) => {
      // 1. Rimuovi relazioni vecchie
      if (raidersToRemove.length > 0) {
        await tx.businessRaider.deleteMany({
          where: {
            businessId: auth.business.id,
            raiderId: { in: raidersToRemove }
          }
        });

        // Rimuovi business da array bussinesActived nei raider rimossi
        for (const raiderId of raidersToRemove) {
          const raider = await tx.raider.findUnique({
            where: { id: raiderId },
            select: { bussinesActived: true }
          });

          if (raider) {
            const newBussinesActived = raider.bussinesActived.filter(
              id => id !== auth.business.id
            );
            await tx.raider.update({
              where: { id: raiderId },
              data: { bussinesActived: newBussinesActived }
            });
          }
        }
      }

      // 2. Aggiungi nuove relazioni
      if (raidersToAdd.length > 0) {
        for (const raiderId of raidersToAdd) {
          await tx.businessRaider.create({
            data: {
              businessId: auth.business.id,
              raiderId,
              confirmedFromBusiness: true,
            }
          });

          // Aggiungi business a array bussinesActived nei nuovi raider
          const raider = await tx.raider.findUnique({
            where: { id: raiderId },
            select: { bussinesActived: true }
          });

          if (raider) {
            const newBussinesActived = Array.from(new Set([
              ...raider.bussinesActived,
              auth.business.id
            ]));
            await tx.raider.update({
              where: { id: raiderId },
              data: { bussinesActived: newBussinesActived }
            });
          }
        }
      }

      // 3. Aggiorna array raiderActived nel Business
      await tx.business.update({
        where: { id: auth.business.id },
        data: {
          raiderActived: raiderIds,
        }
      });
    });

    return NextResponse.json(
      {
        message: "Raiders sincronizzati con successo",
        businessId: auth.business.id,
        currentRaiderIds: raiderIds,
        added: raidersToAdd.length,
        removed: raidersToRemove.length,
        details: {
          addedRaiderIds: raidersToAdd,
          removedRaiderIds: raidersToRemove,
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
