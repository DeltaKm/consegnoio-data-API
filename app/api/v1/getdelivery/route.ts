import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      // Se viene passato un id, restituisce solo quella delivery
      const delivery = await prisma.testDelivery.findUnique({ where: { id } });
      if (!delivery) {
        return NextResponse.json(
          { message: "Delivery non trovata" },
          { status: StatusCodes.NotFound }
        );
      }
      return NextResponse.json(delivery, { status: StatusCodes.Success });
    } else {
      // Altrimenti restituisce tutte le delivery
      const deliveries = await prisma.testDelivery.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(deliveries, { status: StatusCodes.Success });
    }
  } catch (error) {
    console.error("Errore durante il fetch delle consegne", error);
    return NextResponse.json(
      { message: "Errore durante il fetch delle consegne" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
