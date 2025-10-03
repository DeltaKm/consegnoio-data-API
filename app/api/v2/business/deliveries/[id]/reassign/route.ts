import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

// POST - Riassegna ordine a un altro raider
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
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

    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id },
      include: {
        assignedToRaider: true,
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Ordine non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (delivery.businessId !== auth.business.id) {
      return NextResponse.json(
        { message: "Non hai i permessi per riassegnare questo ordine" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Verifica che il nuovo raider esista ed sia abilitato
    const newRaider = await prisma.raider.findUnique({
      where: { id: newRaiderId },
      select: { id: true, deviceTokens: true, name: true, surname: true }
    });

    if (!newRaider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (!auth.business.raiderActived.includes(newRaiderId)) {
      return NextResponse.json(
        { message: "Il raider selezionato non è abilitato per questo business" },
        { status: StatusCodes.BadRequest }
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
        message: "Ordine riassegnato con successo",
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
