// app/api/v1/reltest/assignRaiderToBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
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


    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
    });
    if (!raider) {
      return NextResponse.json(
        { message: "Raider not found" },
        { status: StatusCodes.NotFound }
      );
    }

   
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json(
        { message: "Business not found" },
        { status: StatusCodes.NotFound }
      );
    }


    const existingRelation = await prisma.businessRaider.findFirst({
      where: { raiderId, businessId },
    });
    if (existingRelation) {
      return NextResponse.json(
        { message: "Raider already assigned to the business.", relation: existingRelation },
        { status: StatusCodes.BadRequest }
      );
    }


    const relation = await prisma.businessRaider.create({
      data: {
        raiderId,
        businessId,
        confirmed: true,
      },
    });

    
    let updatedRaider = raider;
    if (!raider.bussinesActived.includes(businessId)) {
      const newActives = [...raider.bussinesActived, businessId];
      updatedRaider = await prisma.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: newActives },
      });
    }

   
    let updatedBusiness = business;
    if (!business.raiderActived.includes(raiderId)) {
      const newRaiders = [...business.raiderActived, raiderId];
      updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: { raiderActived: newRaiders },
      });
    }

    return NextResponse.json(
      {
        message: "Raider assigned to the business successfully.",
        relation,
        updatedRaider,
        updatedBusiness,
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Error during raider assignment to business:", error);
    return NextResponse.json(
      { message: "Internal error during assignment", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
