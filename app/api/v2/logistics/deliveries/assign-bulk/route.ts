import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

// POST - Assegna multipli ordini a raider
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
    const { deliveryIds, raiderId } = body;

    if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
      return NextResponse.json(
        { message: "deliveryIds deve essere un array non vuoto" },
        { status: StatusCodes.BadRequest }
      );
    }

    if (!raiderId) {
      return NextResponse.json(
        { message: "raiderId è obbligatorio" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifica raider
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      select: { id: true, deviceTokens: true, name: true, surname: true }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Recupera deliveries
    const deliveries = await prisma.deliveryEA.findMany({
      where: {
        id: { in: deliveryIds },
        isAssigned: false,
      }
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { message: "Nessun ordine disponibile per l'assegnazione" },
        { status: StatusCodes.BadRequest }
      );
    }

    const assignedIds: string[] = [];

    // Assegna in transazione
    await prisma.$transaction(async (tx) => {
      for (const delivery of deliveries) {
        // Crea AssignedDelivery
        await tx.assignedDelivery.create({
          data: {
            deliveryId: delivery.id,
            raiderId: raider.id,
          }
        });

        // Aggiorna delivery
        await tx.deliveryEA.update({
          where: { id: delivery.id },
          data: {
            assignedToRaiderId: raider.id,
            status: "ASSIGNED",
            isAssigned: true,
          }
        });

        assignedIds.push(delivery.id);
      }
    });

    // Notifica raider
    if (raider.deviceTokens && raider.deviceTokens.length > 0) {
      try {
        await sendNotification(
          raider.id,
          raider.deviceTokens,
          "Nuove consegne assegnate",
          `Ti sono state assegnate ${assignedIds.length} nuove consegne`,
          {
            type: "bulk_assignment",
            count: String(assignedIds.length),
          }
        );
      } catch (notificationError) {
        console.error("Errore notifica:", notificationError);
      }
    }

    return NextResponse.json(
      {
        message: `${assignedIds.length} ordini assegnati con successo`,
        assignedDeliveryIds: assignedIds,
        raiderId: raider.id,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore assegnazione bulk:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
