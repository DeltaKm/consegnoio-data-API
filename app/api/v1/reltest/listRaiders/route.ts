import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const raider = await prisma.raider.findUnique({
        where: { id },
        include: {
          businessRelations: true,
          user: true,
        },
      });
      if (!raider) {
        return NextResponse.json(
          { message: "Raider non trovata" },
          { status: StatusCodes.NotFound }
        );
      }
      return NextResponse.json(raider, { status: StatusCodes.Success });
    } else {
      // Se non viene passato nessun id, restituisce tutti i Raider
      const raiders = await prisma.raider.findMany({
        include: {
          businessRelations: true,
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ raiders }, { status: StatusCodes.Success });
    }
  } catch (error: any) {
    console.error("Errore nel recupero dei Raider:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero dei Raider", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
