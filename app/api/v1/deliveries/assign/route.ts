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
