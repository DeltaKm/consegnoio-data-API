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

// PUT - Attiva/Disattiva un'attività gestita da questa logistica
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
    const { expired } = body;

    if (typeof expired !== "boolean") {
      return NextResponse.json(
        { message: "Il campo 'expired' deve essere un boolean" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifica che il business sia tra quelli gestiti da questa logistica
    const relation = await prisma.logisticsBusiness.findFirst({
      where: { logisticsId: auth.logistics.id, businessId: params.id },
    });

    if (!relation) {
      return NextResponse.json(
        { message: "Non hai i permessi su questa attività" },
        { status: StatusCodes.Forbidden }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!business || !business.userId) {
      return NextResponse.json(
        { message: "Attività non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: business.userId },
      data: { expired },
      select: { id: true, email: true, expired: true },
    });

    return NextResponse.json(
      {
        message: expired ? "Attività disattivata" : "Attività attivata",
        user: updatedUser,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore cambio status business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
