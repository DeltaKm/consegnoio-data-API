import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

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
    const { logisticsId, businessIds } = body;

    if (!logisticsId || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json(
        { 
          message: "logisticsId e businessIds (array) sono obbligatori",
          example: {
            logisticsId: "logistics_id",
            businessIds: ["business_id_1", "business_id_2"]
          }
        },
        { status: StatusCodes.BadRequest }
      );
    }

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

    // Verifica che i business esistano
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } }
    });

    const foundIds = businesses.map(b => b.id);
    const missing = businessIds.filter(id => !foundIds.includes(id));

    if (missing.length > 0) {
      return NextResponse.json(
        { 
          message: "Alcuni business non sono stati trovati",
          missing 
        },
        { status: StatusCodes.NotFound }
      );
    }

    // Crea le relazioni
    const created = [];
    for (const businessId of foundIds) {
      const relation = await prisma.logisticsBusiness.upsert({
        where: {
          logisticsId_businessId: {
            logisticsId,
            businessId
          }
        },
        update: {},
        create: {
          logisticsId,
          businessId
        }
      });
      created.push(relation);
    }

    return NextResponse.json(
      {
        message: `${created.length} business assegnati con successo`,
        logisticsId,
        assignedBusinessIds: foundIds,
        missing: missing.length > 0 ? missing : undefined
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
