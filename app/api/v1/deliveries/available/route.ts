import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// export async function GET(request: NextRequest) {
//   const decoded = await authenticateToken(request);
//   if (!decoded) {
//     return NextResponse.json(
//       { message: "Utente non autorizzato" },
//       { status: StatusCodes.Unauthorized }
//     );
//   }

//   try {
//     const deliveries = await prisma.deliveryEA.findMany({
//       where: {
//         isAssigned: false,
//         isCompleted: false,
//         status: {
//           in: ["CREATED", "RELEASED"],
//         },
//       },
//       orderBy: { schedulingDelivery: "asc" },
//     });

//     return NextResponse.json(deliveries, { status: StatusCodes.Success });
//   } catch (error: any) {
//     console.error("Errore durante il recupero delle consegne disponibili:", error);
//     return NextResponse.json(
//       { message: "Errore interno", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }

export async function GET(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Utente non autorizzato" },
      { status: StatusCodes.Unauthorized }
    );
  }
  const userId = decoded.userId as string;

  try {
    // Prendo i business attivati per questo raider
    const raider = await prisma.raider.findFirst({
      where: { userId },
      select: { bussinesActived: true },
    });
    const activeBiz = raider?.bussinesActived ?? [];

    // Se non ha business attivi, ritorno subito array vuoto
    if (activeBiz.length === 0) {
      return NextResponse.json([], { status: StatusCodes.Success });
    }

    // Filtro le consegne sui business “attivati”
    const deliveries = await prisma.deliveryEA.findMany({
      where: {
        isAssigned: false,
        isCompleted: false,
        status: { in: ["CREATED", "RELEASED"] },
        businessId: { in: activeBiz },
      },
      orderBy: { schedulingDelivery: "asc" },
    });

    return NextResponse.json(deliveries, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante il recupero delle consegne disponibili:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
