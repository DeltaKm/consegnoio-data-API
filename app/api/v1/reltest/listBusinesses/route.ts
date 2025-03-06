import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  InternalServerError = 500,
}

export async function GET() {
  try {
    // Recupera tutti i business includendo le relazioni con i raider
    const businesses = await prisma.business.findMany({
      include: {
        raiderRelations: true, // contiene i record pivot
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Per ogni business, computa l'array di raider attivi
    const businessesWithActiveRaiders = businesses.map((business) => ({
      ...business,
      activeRaiders: business.raiderRelations
        .filter((rel) => rel.confirmed)
        .map((rel) => rel.raiderId),
    }));

    return NextResponse.json(
      { businesses: businessesWithActiveRaiders },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore nel recupero dei Business:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero dei Business", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
