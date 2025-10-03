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

// PUT - Cambia ruolo utente
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
    const { role } = body;

    const validRoles = ["ADMIN", "USER", "LOGISTICS", "BUSINESS", "RAIDER"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { message: `Ruolo non valido. Valori permessi: ${validRoles.join(", ")}` },
        { status: StatusCodes.BadRequest }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json(
      {
        message: "Ruolo aggiornato con successo",
        user: updatedUser
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore cambio ruolo:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
