import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, raiderId, confirmed } = body;
    if (!businessId || !raiderId) {
      return NextResponse.json(
        { message: "businessId e raiderId sono richiesti" },
        { status: StatusCodes.BadRequest }
      );
    }
    const relation = await prisma.businessRaider.create({
      data: {
        businessId,
        raiderId,
        confirmed: confirmed ?? false,
      },
    });
    return NextResponse.json(
      { message: "Relazione Business-Raider creata", relation },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore durante la creazione della relazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la creazione della relazione", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
