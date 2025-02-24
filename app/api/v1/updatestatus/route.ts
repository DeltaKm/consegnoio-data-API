import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const isAssignedParam = request.nextUrl.searchParams.get("isAssigned");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    if (isAssignedParam === null) {
      return NextResponse.json(
        { message: "Parametro 'isAssigned' richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const isAssigned = isAssignedParam === "true";

    const updatedDelivery = await prisma.testDelivery.update({
      where: { id },
      data: { isAssigned },
    });

    return NextResponse.json(
      { status: "success", delivery: updatedDelivery },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'ordine:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'ordine o ID non trovato" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
