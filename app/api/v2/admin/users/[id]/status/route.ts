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

// PUT - Attiva/Disattiva utente
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
    const { expired } = body;

    if (typeof expired !== "boolean") {
      return NextResponse.json(
        { message: "Il campo 'expired' deve essere un boolean" },
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
      data: { expired },
      select: {
        id: true,
        email: true,
        expired: true,
      }
    });

    return NextResponse.json(
      {
        message: expired ? "Utente disattivato" : "Utente attivato",
        user: updatedUser
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore cambio status:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
