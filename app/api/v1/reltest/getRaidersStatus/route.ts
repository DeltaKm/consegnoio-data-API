// app/api/v1/reltest/getRaidersByBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("id");
    if (!businessId) {
      return NextResponse.json(
        {
          message: "Missing query parameter 'businessId'.",
          example: { businessId: "ID_Business" },
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const relations = await prisma.businessRaider.findMany({
      where: { businessId },
      select: {
        raider: { select: { id: true } },
        confirmedFromBusiness: true,
      },
    });

    if (!relations || relations.length === 0) {
      return NextResponse.json(
        { message: "No raiders found for this business." },
        { status: StatusCodes.NotFound }
      );
    }

    const responseData = relations.map((relation) => ({
      raider_id: relation.raider.id,
      confirmed: relation. confirmedFromBusiness,
    }));

    return NextResponse.json(responseData, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Error retrieving raiders for business:", error);
    return NextResponse.json(
      { message: "Internal error", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
