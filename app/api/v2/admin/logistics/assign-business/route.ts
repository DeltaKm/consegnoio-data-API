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

const assignBusinessSchema = z.object({
  logisticsId: z.string(),
  businessIds: z.array(z.string()).min(1),
});

// POST - Assegna business a logistics
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
    const validation = assignBusinessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { logisticsId, businessIds } = validation.data;

    // Verifica che logistics esista
    const logistics = await prisma.logistics.findUnique({
      where: { id: logisticsId }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
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

    // Assegna business al logistics
    const created = [];
    for (const businessId of businessIds) {
      const relation = await prisma.logisticsBusiness.upsert({
        where: {
          logisticsId_businessId: {
            logisticsId,
            businessId,
          }
        },
        update: {},
        create: {
          logisticsId,
          businessId,
        }
      });
      created.push(relation);
    }

    return NextResponse.json(
      {
        message: `${businessIds.length} business assegnati al logistics con successo`,
        logisticsId,
        assignedBusinessIds: businessIds,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore assegnazione business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Sincronizza business assegnati a logistics
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
    const validation = assignBusinessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { logisticsId, businessIds } = validation.data;

    // Verifica che logistics esista
    const logistics = await prisma.logistics.findUnique({
      where: { id: logisticsId },
      include: {
        businessRelations: {
          select: { businessId: true }
        }
      }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
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
    const currentBusinessIds = logistics.businessRelations.map(rel => rel.businessId);
    const businessToAdd = businessIds.filter(id => !currentBusinessIds.includes(id));
    const businessToRemove = currentBusinessIds.filter(id => !businessIds.includes(id));

    // Sincronizza
    await prisma.$transaction(async (tx) => {
      // Rimuovi vecchie relazioni
      if (businessToRemove.length > 0) {
        await tx.logisticsBusiness.deleteMany({
          where: {
            logisticsId: logisticsId,
            businessId: { in: businessToRemove }
          }
        });
      }

      // Aggiungi nuove relazioni
      if (businessToAdd.length > 0) {
        for (const businessId of businessToAdd) {
          await tx.logisticsBusiness.create({
            data: {
              logisticsId,
              businessId,
            }
          });
        }
      }
    });

    return NextResponse.json(
      {
        message: "Business sincronizzati con successo",
        logisticsId,
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
    console.error("Errore sincronizzazione business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
