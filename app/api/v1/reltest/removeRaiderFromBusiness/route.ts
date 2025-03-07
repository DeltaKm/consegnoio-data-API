// app/api/v1/reltest/removeRaiderFromBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function DELETE(request: NextRequest) {
  try {
   
    const bodyText = await request.text();
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        {
          message: "Missing fields. Example of payload:",
          example: { raiderId: "ID_Raider", businessId: "ID_Business" },
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = JSON.parse(bodyText);
    const { raiderId, businessId } = body;

    
    if (!raiderId || !businessId) {
      return NextResponse.json(
        {
          message: "The fields raiderId and businessId are required.",
          example: { raiderId: "ID_Raider", businessId: "ID_Business" },
        },
        { status: StatusCodes.BadRequest }
      );
    }
  
    const existingRelation = await prisma.businessRaider.findFirst({
      where: { raiderId, businessId },
    });
    if (!existingRelation) {
      return NextResponse.json(
        { message: "Relation not found. Raider is not assigned to the business." },
        { status: StatusCodes.NotFound }
      );
    }

 
    await prisma.businessRaider.delete({
      where: { id: existingRelation.id },
    });
  
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
    });
    if (raider) {
      const updatedBusinessActived = raider.bussinesActived.filter(
        (bid: string) => bid !== businessId
      );
      await prisma.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: updatedBusinessActived },
      });
    } else {
      return NextResponse.json(
        { message: "Raider not found" },
        { status: StatusCodes.NotFound }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (business) {
      const updatedRaiderActived = business.raiderActived.filter(
        (rid: string) => rid !== raiderId
      );
      await prisma.business.update({
        where: { id: businessId },
        data: { raiderActived: updatedRaiderActived },
      });
    } else {
      return NextResponse.json(
        { message: "Business not found" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json(
      { message: "Relation removed successfully." },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error during removal of relation:", error);
    return NextResponse.json(
      { message: "Internal error during removal", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
