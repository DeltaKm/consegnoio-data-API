// app/api/updatedelivery/route.ts

import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testDeliverySchema } from "@/lib/zod";
import { optional } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const optional = testDeliverySchema.partial({
      name: true,
      pickupAddress: true,
      deliveryAddress: true,
      totalDistance: true,
      deliveryType: true,
      peso: true,
      numeroColli: true,
      compensation: true,
      status: true,
      schedulingDelivery: true,
      note: true
    })

    const body = await request.json();
    const result = optional.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const updatedDelivery = await prisma.testDelivery.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'ordine:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'ordine o ID non trovato" },
      { status: StatusCodes.InternalServerError }
    );
  }
}