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

    // Verifichiamo se esiste già una relazione nel modello pivot
    let relation = await prisma.businessRaider.findFirst({
      where: { raiderId, businessId },
    });

    if (!relation) {
      relation = await prisma.businessRaider.create({
        data: {
          raiderId,
          businessId,
          confirmed: true,
        },
      });
    } else {
      relation = await prisma.businessRaider.update({
        where: { id: relation.id },
        data: { confirmed: true },
      });
    }

    // Aggiorniamo il profilo del raider: aggiorniamo bussinesActived
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
    });
    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    let updatedRaider = raider;
    if (!raider.bussinesActived.includes(businessId)) {
      const newActives = [...raider.bussinesActived, businessId];
      updatedRaider = await prisma.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: newActives },
      });
    }

    // Aggiorniamo il profilo del business: aggiorniamo raiderActived
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    let updatedBusiness = business;
    if (!business.raiderActived.includes(raiderId)) {
      const newRaiders = [...business.raiderActived, raiderId];
      updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: { raiderActived: newRaiders },
      });
    }

    return NextResponse.json(
      {
        message: "Raider assegnato al business con successo",
        relation,
        updatedRaider,
        updatedBusiness,
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
