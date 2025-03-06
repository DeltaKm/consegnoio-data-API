import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  InternalServerError = 500,
}

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        raiderRelations: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ businesses }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore nel recupero dei Business:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero dei Business", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
