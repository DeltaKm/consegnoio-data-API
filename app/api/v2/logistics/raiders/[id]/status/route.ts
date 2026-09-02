import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

// PUT - Attiva/Disattiva un raider collegato a una delle attività gestite da
// questa logistica (scope più ampio del PATCH esistente, che permette solo
// di modificare i raider creati direttamente dalla logistica).
export async function PUT(
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Il campo 'isActive' deve essere un boolean" },
        { status: StatusCodes.BadRequest }
      );
    }

    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true },
    });
    const businessIds = businessesManaged.map((lb) => lb.businessId);

    const raider = await prisma.raider.findFirst({
      where: {
        id: params.id,
        businessRelations: { some: { businessId: { in: businessIds } } },
      },
      select: { id: true },
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato o non collegato alle tue attività" },
        { status: StatusCodes.Forbidden }
      );
    }

    const updatedRaider = await prisma.raider.update({
      where: { id: params.id },
      data: { isActive },
      select: { id: true, name: true, surname: true, isActive: true },
    });

    return NextResponse.json(
      {
        message: isActive ? "Raider attivato" : "Raider disattivato",
        raider: updatedRaider,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore cambio status raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
