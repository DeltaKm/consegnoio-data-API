import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// PUT - Attiva/Disattiva raider
export async function PUT(
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Il campo 'isActive' deve essere un boolean" },
        { status: StatusCodes.BadRequest }
      );
    }

    const raider = await prisma.raider.findUnique({
      where: { id: params.id }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const updatedRaider = await prisma.raider.update({
      where: { id: params.id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        surname: true,
        isActive: true,
      }
    });

    return NextResponse.json(
      {
        message: isActive ? "Raider attivato" : "Raider disattivato",
        raider: updatedRaider
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
