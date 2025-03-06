import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET() {
  try {
    const deliveryTypeValues = await prisma.deliveryTypeValue.findMany({
      orderBy: { label: "asc" },
      select: {
        label: true,
        value: true,
      },
    });
    return NextResponse.json(deliveryTypeValues, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante il fetch dei record DeliveryTypeValue", error);
    return NextResponse.json(
      { message: "Errore durante il fetch dei record DeliveryTypeValue" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
