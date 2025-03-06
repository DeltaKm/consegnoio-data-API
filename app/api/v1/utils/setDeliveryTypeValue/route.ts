//get statusvalue
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createDeliveryTypeValueSchema = z.object({  
  label: z.string(),
  value: z.string(),
});

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createDeliveryTypeValueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: parsed.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { label, value } = parsed.data;

    const newDeliveryTypeValue = await prisma.deliveryTypeValue.create({
      data: { label, value },
    });

    return NextResponse.json(newDeliveryTypeValue, { status: StatusCodes.Created });
  } catch (error: any) {
    console.error("Errore durante la creazione del record DeliveryTypeValue", error);
    return NextResponse.json(
      { message: "Errore durante la creazione del record DeliveryTypeValue" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
