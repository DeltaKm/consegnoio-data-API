import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

// POST - Riassegna ordine a un raider (Logistics)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
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

    // Ottieni business gestiti dal logistics
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    if (businessIds.length === 0) {
      return NextResponse.json(
        { message: "Nessun business gestito" },
        { status: StatusCodes.Forbidden }
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

    // Verifica che la delivery appartenga a un business gestito
    if (!delivery.businessId || !businessIds.includes(delivery.businessId)) {
      return NextResponse.json(
        { message: "Non hai i permessi per riassegnare questa delivery" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Verifica che il nuovo raider esista
    const newRaider = await prisma.raider.findUnique({
      where: { id: newRaiderId },
      select: { 
        id: true, 
        deviceTokens: true, 
        name: true, 
        surname: true,
        createdByLogisticsId: true,
        bussinesActived: true
      }
    });

    if (!newRaider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che il raider sia gestito da questo logistics O sia abilitato per il business
    const isRaiderManaged = newRaider.createdByLogisticsId === auth.logistics.id;
    const isRaiderEnabledForBusiness = newRaider.bussinesActived.includes(delivery.businessId);

    if (!isRaiderManaged && !isRaiderEnabledForBusiness) {
      return NextResponse.json(
        { message: "Il raider selezionato non è gestito da questo logistics o non è abilitato per il business" },
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
