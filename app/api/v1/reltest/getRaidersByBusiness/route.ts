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
          example: { businessId: "ID_Business" }
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const raiders = await prisma.raider.findMany({
      where: {
        bussinesActived: { has: businessId },
      },
      include: {
        businessRelations: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!raiders || raiders.length === 0) {
      return NextResponse.json(
        { message: "No raiders found for this business." },
        { status: StatusCodes.NotFound }
      );
    }

    const sanitizedRaiders = raiders.map((r) => {
      const { isActive, bussinesActived, createdAt, updateAt, businessRelations, ...raiderRest } = r;
      const filteredRelations = businessRelations.filter(
        (rel) => rel.businessId === businessId
      );
      const sanitizedUser = r.user
        ? (({ password, role, confirmed, confirmationToken, resetPasswordToken, resetPasswordExpiration, tokenJWT, expirationJWT, expired, creatdeAt, updateAt, ...restUser }) => restUser)(r.user)
        : null;
      return {
        ...raiderRest,
        businessRelations: filteredRelations,
        user: sanitizedUser,
      };
    });

    return NextResponse.json({ raiders: sanitizedRaiders }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Error retrieving raiders by business:", error);
    return NextResponse.json(
      { message: "Internal error", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
