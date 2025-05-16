// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";
// import { authenticateToken } from "@/app/lib/auth";

// enum StatusCodes {
//   Success = 200,
//   BadRequest = 400,
//   Unauthorized = 401,
//   Conflict = 409,
//   InternalServerError = 500,
//   NotFound = 404,
// }

// export async function POST(request: NextRequest) {
//   const decoded = await authenticateToken(request);
//   if (!decoded) {
//     return NextResponse.json(
//       { message: "Utente non autorizzato" },
//       { status: StatusCodes.Unauthorized }
//     );
//   }

//   const userId = decoded.userId;

//   // Recupera l'ID del raider associato all'user
//   const raider = await prisma.raider.findFirst({ where: { userId } });
//   if (!raider) {
//     return NextResponse.json(
//       { message: "Profilo Raider non trovato" },
//       { status: StatusCodes.NotFound }
//     );
//   }

//   try {
//     const body = await request.json();
//     const { deliveryId } = body;

//     if (!deliveryId) {
//       return NextResponse.json(
//         { message: "deliveryId mancante nel body" },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     // Verifica che la delivery esista
//     const delivery = await prisma.deliveryEA.findUnique({ where: { id: deliveryId } });
//     if (!delivery) {
//       return NextResponse.json(
//         { message: "Consegna non trovata" },
//         { status: StatusCodes.NotFound }
//       );
//     }

//     // Verifica duplicato
//     const existing = await prisma.assignedDelivery.findFirst({
//       where: {
//         deliveryId,
//         raiderId: raider.id,
//       },
//     });

//     if (existing) {
//       return NextResponse.json(
//         { message: "La consegna è già assegnata a questo rider" },
//         { status: StatusCodes.Conflict }
//       );
//     }

//     // Crea assegnazione
//     const assigned = await prisma.assignedDelivery.create({
//       data: {
//         deliveryId,
//         raiderId: raider.id,
//       },
//     });

//     // Aggiorna stato delivery (facoltativo)
//     await prisma.deliveryEA.update({
//       where: { id: deliveryId },
//       data: {
//         assignedToRaiderId: raider.id,
//         status: "ASSIGNED" ,
//         isAssigned: true,
//       },
//     });

//     return NextResponse.json(
//       { message: "Consegna assegnata correttamente", assigned },
//       { status: StatusCodes.Success }
//     );
//   } catch (error: any) {
//     console.error("Errore durante l'assegnazione:", error);
//     return NextResponse.json(
//       { message: "Errore interno", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Conflict = 409,
  InternalServerError = 500,
  NotFound = 404,
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

  const raider = await prisma.raider.findFirst({ where: { userId } });
  if (!raider) {
    return NextResponse.json(
      { message: "Profilo Raider non trovato" },
      { status: StatusCodes.NotFound }
    );
  }

  try {
    const body = await request.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { message: "deliveryId mancante nel body" },
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

    const existingAssignment = await prisma.assignedDelivery.findFirst({
      where: { deliveryId },
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { message: "La consegna è già assegnata a un rider" },
        { status: StatusCodes.Conflict }
      );
    }
    
    const assigned = await prisma.assignedDelivery.create({
      data: {
        deliveryId,
        raiderId: raider.id,
      },
    });

    const updatedDelivery = await prisma.deliveryEA.update({
      where: { id: deliveryId },
      data: {
        assignedToRaiderId: raider.id,
        status: "ASSIGNED",
        isAssigned: true,
      },
    });

    // Invia notifica al rider che ha ricevuto l'assegnazione
    try {
      if (raider.deviceTokens && raider.deviceTokens.length > 0) {
        // Formatta la data di consegna in un formato leggibile
        // Utilizziamo schedulingDelivery invece di schedulingDeliveryDate
        const schedulingTime = delivery.schedulingDelivery ? new Date(delivery.schedulingDelivery) : new Date();
        const formattedDate = schedulingTime.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const formattedTime = schedulingTime.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const fullFormattedDate = `${formattedDate} ${formattedTime}`;
        
        await sendNotification(
          raider.id,
          raider.deviceTokens,
          "Nuova consegna assegnata",
          `Consegna assegnata da ${delivery.name || 'Attività'} - Data: ${fullFormattedDate}`,
          {
            type: "assigned_delivery",
            deliveryId: delivery.id,
            businessName: delivery.name || "Attività",
            scheduledDate: fullFormattedDate,
            // Rimuoviamo gli indirizzi come richiesto
          }
        );
      }
    } catch (notificationError) {
      console.error(`Errore nell'invio della notifica al rider ${raider.id}:`, notificationError);
      // Continuiamo anche se fallisce la notifica
    }

    // Aggiorna lo stato su EasyAppear
    try {
      const mapping: Record<string, string> = {
        "ASSIGNED": "confirmed",
      };
      const stateValue = mapping["ASSIGNED"];
      if (stateValue && updatedDelivery.orderId) {
        await fetch("https://app.easyappear.it/webservice/set_order_state_consegnoio/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: updatedDelivery.businessId,
            order_id: updatedDelivery.orderId,
            state: stateValue,
          }),
        });
      }
    } catch (externalError) {
      console.error("Errore durante l'invio a EasyAppear:", externalError);
    }

    return NextResponse.json(
      { message: "Consegna assegnata correttamente", assigned },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore durante l'assegnazione:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
