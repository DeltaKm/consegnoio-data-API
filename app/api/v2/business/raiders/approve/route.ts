import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// POST - Approva raider (singolo o multipli)
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
    const { raiderId, raiderIds } = body;

    // Supporta sia singolo che array
    let raiderIdsArray: string[];
    if (raiderId) {
      raiderIdsArray = [raiderId];
    } else if (raiderIds && Array.isArray(raiderIds)) {
      raiderIdsArray = raiderIds;
    } else {
      return NextResponse.json(
        { message: "Devi fornire 'raiderId' (singolo) o 'raiderIds' (array)" },
        { status: StatusCodes.BadRequest }
      );
    }

    if (raiderIdsArray.length === 0) {
      return NextResponse.json(
        { message: "Almeno un raider deve essere specificato" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifica che le relazioni esistano
    const relations = await prisma.businessRaider.findMany({
      where: {
        businessId: auth.business.id,
        raiderId: { in: raiderIdsArray }
      }
    });

    if (relations.length === 0) {
      return NextResponse.json(
        { message: "Nessuna relazione trovata per i raider specificati" },
        { status: StatusCodes.NotFound }
      );
    }

    const foundRaiderIds = relations.map(r => r.raiderId);

    // Aggiorna le relazioni
    await prisma.businessRaider.updateMany({
      where: {
        businessId: auth.business.id,
        raiderId: { in: foundRaiderIds }
      },
      data: {
        confirmedFromBusiness: true,
      }
    });

    // Aggiorna array raiderActived nel Business
    const currentActived = auth.business.raiderActived;
    const newActived = Array.from(new Set([...currentActived, ...foundRaiderIds]));

    await prisma.business.update({
      where: { id: auth.business.id },
      data: {
        raiderActived: newActived,
      }
    });

    // Aggiorna array bussinesActived nei Raider
    for (const raiderId of foundRaiderIds) {
      const raider = await prisma.raider.findUnique({
        where: { id: raiderId },
        select: { bussinesActived: true }
      });

      if (raider) {
        const newBizActived = Array.from(new Set([...raider.bussinesActived, auth.business.id]));
        await prisma.raider.update({
          where: { id: raiderId },
          data: {
            bussinesActived: newBizActived,
          }
        });
      }
    }

    return NextResponse.json(
      {
        message: `${foundRaiderIds.length} raider approvati con successo`,
        approvedRaiderIds: foundRaiderIds,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore approvazione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
