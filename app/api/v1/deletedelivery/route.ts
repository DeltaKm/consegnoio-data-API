// app/api/deletedelivery/route.ts

import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const deletedDelivery = await prisma.testDelivery.delete({
      where: { id },
    });

    return NextResponse.json(deletedDelivery, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'ordine", error);
    return NextResponse.json(
      { message: "Errore durante l'eliminazione dell'ordine" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
