import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

// PUT - Attiva/Disattiva un raider collegato a questo business
// (diverso da "in servizio", che resta una scelta esclusiva del raider dall'app)
export async function PUT(
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Il campo 'isActive' deve essere un boolean" },
        { status: StatusCodes.BadRequest }
      );
    }

    const relation = await prisma.businessRaider.findFirst({
      where: { businessId: auth.business.id, raiderId: params.id },
    });

    if (!relation) {
      return NextResponse.json(
        { message: "Raider non trovato o non collegato al tuo business" },
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
