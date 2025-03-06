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
      const business = await prisma.business.findUnique({
        where: { id },
        include: {
          raiderRelations: true, // record pivot
          user: true,
        },
      });
      if (!business) {
        return NextResponse.json(
          { message: "Business non trovato" },
          { status: StatusCodes.NotFound }
        );
      }
      const activeRaiders = business.raiderRelations
        .filter((rel) => rel.confirmed)
        .map((rel) => rel.raiderId);

      return NextResponse.json(
        { ...business, activeRaiders },
        { status: StatusCodes.Success }
      );
    } else {
      const businesses = await prisma.business.findMany({
        include: {
          raiderRelations: true,
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });

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
    }
  } catch (error: any) {
    console.error("Errore nel recupero dei Business:", error);
    return NextResponse.json(
      { message: "Errore interno durante il recupero dei Business", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
