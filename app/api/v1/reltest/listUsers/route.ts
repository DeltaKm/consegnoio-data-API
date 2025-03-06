import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  InternalServerError = 500,
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        raiderProfiles: true,
        businessProfiles: true,
      },
      orderBy: { creatdeAt: "desc" },
    });
    return NextResponse.json({ users }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore nel recupero degli utenti:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero degli utenti", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
