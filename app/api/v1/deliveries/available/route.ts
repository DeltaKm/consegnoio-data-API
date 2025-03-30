import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Utente non autorizzato" },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const deliveries = await prisma.deliveryEA.findMany({
      where: {
        isAssigned: false,
        isCompleted: false,
        status: "CREATED",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deliveries, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante il recupero delle consegne disponibili:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
