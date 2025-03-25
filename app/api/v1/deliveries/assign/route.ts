// app/api/v1/deliveries/assign/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get("id");
    if (!deliveryId) {
      return NextResponse.json(
        { message: "Il parametro 'id' (deliveryId) è obbligatorio" },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = await request.json();
    const { raiderId } = body;
    if (!raiderId) {
      return NextResponse.json(
        { message: "Il parametro 'raiderId' è obbligatorio" },
        { status: StatusCodes.BadRequest }
      );
    }

    const updatedDelivery = await prisma.testDeliveryEA.update({
      where: { id: deliveryId },
      data: { isAssigned: true },
    });

    const assignedDelivery = await prisma.aassignedDelivery.create({
      data: {
        deliveryId: deliveryId,
        raiderId: raiderId,
      },
    });

    return NextResponse.json(
      { updatedDelivery, assignedDelivery },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore nell'assegnazione della consegna:", error);
    return NextResponse.json(
      {
        message: "Errore interno nell'assegnazione della consegna",
        error: error.message,
      },
      { status: StatusCodes.InternalServerError }
    );
  }
}
