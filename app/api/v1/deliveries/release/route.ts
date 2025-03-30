import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Utente non autorizzato" },
      { status: StatusCodes.Unauthorized }
    );
  }

  const userId = decoded.userId;

  try {
    const body = await request.json();
    const { deliveryId, note } = body;

    if (!deliveryId || !note) {
      return NextResponse.json(
        { message: "deliveryId e nota sono obbligatori" },
        { status: StatusCodes.BadRequest }
      );
    }

    const delivery = await prisma.deliveryEA.findUnique({ where: { id: deliveryId } });
    if (!delivery) {
      return NextResponse.json(
        { message: "Consegna non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    const raider = await prisma.raider.findFirst({ where: { userId } });
    if (!raider) {
      return NextResponse.json(
        { message: "Profilo Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const released = await prisma.releasedDelivery.create({
      data: {
        deliveryId,
        raiderId: raider.id,
        note,
      },
    });

    await prisma.deliveryEA.update({
      where: { id: deliveryId },
      data: {
        status: "RELEASED",
        isAssigned: false,
        isCompleted: false,
      },
    });

    return NextResponse.json(
      { message: "Consegna rilasciata correttamente", released },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore durante il rilascio della consegna:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}