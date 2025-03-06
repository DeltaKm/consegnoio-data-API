import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  InternalServerError = 500,
}

export async function GET() {
  try {
    const raiders = await prisma.raider.findMany({
      include: {
        businessRelations: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ raiders }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore nel recupero dei Raider:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero dei Raider", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
