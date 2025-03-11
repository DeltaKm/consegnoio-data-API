// app/api/v1/reltest/updateConfirmedFromBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {
  try {
    const relationId = request.nextUrl.searchParams.get("relationId");
    const valueParam = request.nextUrl.searchParams.get("value");

    if (!relationId || valueParam === null) {
      return NextResponse.json(
        {
          message: "Missing query parameters. Example: ?relationId=RELATION_ID&value=true",
        },
        { status: StatusCodes.BadRequest }
      );
    }

    let newValue: boolean;
    if (valueParam.toLowerCase() === "true") {
      newValue = true;
    } else if (valueParam.toLowerCase() === "false") {
      newValue = false;
    } else {
      return NextResponse.json(
        { message: "Invalid value parameter. Use true or false." },
        { status: StatusCodes.BadRequest }
      );
    }

    const existingRelation = await prisma.businessRaider.findUnique({
      where: { id: relationId },
    });
    if (!existingRelation) {
      return NextResponse.json(
        { message: "Relation not found." },
        { status: StatusCodes.NotFound }
      );
    }

    const updatedRelation = await prisma.businessRaider.update({
      where: { id: relationId },
      data: { confirmedFromBusiness: newValue },
    });

    return NextResponse.json(
      { message: "Relation updated successfully.", updatedRelation },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error updating relation:", error);
    return NextResponse.json(
      { message: "Internal error", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
