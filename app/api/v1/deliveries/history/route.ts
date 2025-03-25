// app/api/v1/deliveries/history/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raiderId = searchParams.get("raiderId");
    if (!raiderId) {
      return NextResponse.json(
        { message: "Il parametro 'raiderId' è obbligatorio" },
        { status: StatusCodes.BadRequest }
      );
    }

    const historyDeliveries = await prisma.historyDelivery.findMany({
      where: { raiderId: raiderId },

    });

    return NextResponse.json(historyDeliveries, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore nel recupero dello storico consegne:", error);
    return NextResponse.json(
      { message: "Errore interno nel recupero dello storico consegne", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
