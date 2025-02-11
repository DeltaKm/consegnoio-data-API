// deve avre dei parametri per l' id bussines
// deve ritorna succes e la i dati inseriti
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testDeliverySchema } from "@/lib/zod";

enum StatusCodes {
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {

    // rende opzionale il campo name
    // const nameop = testDeliverySchema.partial({
    //   name: true
    // })
    // const body = await request.json();
    // const result = nameop.safeParse(body);

    const body = await request.json();
    const result = testDeliverySchema.safeParse(body);


    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const newDelivery = await prisma.testDelivery.create({
      data: result.data,
    });

    return NextResponse.json(newDelivery, { status: StatusCodes.Created });
  } catch (error) {
    console.error("Errore durante la creazione dell'ordine", error);
    return NextResponse.json(
      { message: "Errore durante la creazione dell'ordine" },
      { status: StatusCodes.InternalServerError }
    );
  }
}

