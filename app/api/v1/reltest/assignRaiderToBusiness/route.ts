import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raiderId, businessId } = body;

    if (!raiderId || !businessId) {
      return NextResponse.json(
        { message: "I campi raiderId e businessId sono obbligatori" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifichiamo se esiste già una relazione per questa coppia
    let relation = await prisma.businessRaider.findFirst({
      where: { raiderId, businessId },
    });

    // Se la relazione non esiste, la creiamo
    if (!relation) {
      relation = await prisma.businessRaider.create({
        data: {
          raiderId,
          businessId,
          confirmed: true,
        },
      });
    } else {
      // Se esiste, la aggiorniamo impostando confirmed a true
      relation = await prisma.businessRaider.update({
        where: { id: relation.id },
        data: { confirmed: true },
      });
    }

    // Recuperiamo il record del raider per aggiornare l'array dei business attivi
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Aggiorniamo l'array bussinesActived se il businessId non è già presente
    let updatedRaider = raider;
    if (!raider.bussinesActived.includes(businessId)) {
      const newActives = [...raider.bussinesActived, businessId];
      updatedRaider = await prisma.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: newActives },
      });
    }

    return NextResponse.json(
      {
        message: "Raider assegnato al business con successo",
        relation,
        updatedRaider,
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore durante l'assegnazione del raider al business:", error);
    return NextResponse.json(
      { message: "Errore interno durante l'assegnazione", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
