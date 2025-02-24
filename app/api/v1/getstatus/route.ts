import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const delivery = await prisma.testDelivery.findUnique({
      where: { id },
      select: { isAssigned: true, isCompleted: true },
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Consegna non trovata" },
        { status: StatusCodes.BadRequest }
      );
    }

    let deliveryStatus: string;
    if (delivery.isCompleted) {
      deliveryStatus = "is completed";
    } else if (delivery.isAssigned) {
      deliveryStatus = "is assigned";
    } else {
      deliveryStatus = "not assigned";
    }

    return NextResponse.json(
      { status: "success", id, deliveryStatus },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante il recupero dello status:", error);
    return NextResponse.json(
      { message: "Errore durante il recupero dello status" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
