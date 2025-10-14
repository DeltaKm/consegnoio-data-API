import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// POST - Riassegna ordine a un raider (Admin - accesso completo)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const { newRaiderId } = body;

    if (!newRaiderId) {
      return NextResponse.json(
        { message: "newRaiderId è obbligatorio" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifica che delivery esista
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id },
      include: {
        assignedToRaider: true,
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Delivery non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che il nuovo raider esista
    const newRaider = await prisma.raider.findUnique({
      where: { id: newRaiderId },
      select: { 
        id: true, 
        deviceTokens: true, 
        name: true, 
        surname: true
      }
    });

    if (!newRaider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const oldRaiderId = delivery.assignedToRaiderId;

    // Transazione per riassegnare
    await prisma.$transaction(async (tx) => {
      // Rimuovi vecchia assegnazione se esiste
      if (oldRaiderId) {
        await tx.assignedDelivery.deleteMany({
          where: {
            deliveryId: params.id,
            raiderId: oldRaiderId,
          }
        });
      }

      // Crea nuova assegnazione
      await tx.assignedDelivery.create({
        data: {
          deliveryId: params.id,
          raiderId: newRaiderId,
        }
      });

      // Aggiorna delivery
      await tx.deliveryEA.update({
        where: { id: params.id },
        data: {
          assignedToRaiderId: newRaiderId,
          status: "ASSIGNED",
          isAssigned: true,
        }
      });
    });

    // Notifica nuovo raider
    if (newRaider.deviceTokens && newRaider.deviceTokens.length > 0) {
      try {
        const schedulingTime = delivery.schedulingDelivery ? new Date(delivery.schedulingDelivery) : new Date();
        const formattedTime = schedulingTime.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        });

        await sendNotification(
          newRaider.id,
          newRaider.deviceTokens,
          "Nuova consegna assegnata",
          `${delivery.name} - Orario: ${formattedTime}`,
          {
            type: "assigned_delivery",
            deliveryId: delivery.id,
            businessName: delivery.name || "",
            scheduledTime: formattedTime,
          }
        );
      } catch (notificationError) {
        console.error("Errore notifica:", notificationError);
      }
    }

    return NextResponse.json(
      {
        message: "Delivery riassegnata con successo",
        oldRaiderId,
        newRaiderId,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore riassegnazione delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
