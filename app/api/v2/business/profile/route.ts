import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    return NextResponse.json(
      {
        user: {
          id: auth.user.id,
          email: auth.user.email,
          role: auth.user.role,
        },
        business: {
          id: auth.business.id,
          name: auth.business.bussinesName,
          address: auth.business.address,
          coordinates: auth.business.businessCord,
          raiderActived: auth.business.raiderActived,
          createdAt: auth.business.createdAt,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero profilo business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const { bussinesName, address, businessCord } = body;

    const updateData: any = {};
    if (bussinesName) updateData.bussinesName = bussinesName;
    if (address) updateData.address = address;
    if (businessCord !== undefined) updateData.businessCord = businessCord;

    const updatedBusiness = await prisma.business.update({
      where: { id: auth.business.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "Profilo aggiornato con successo",
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.bussinesName,
          address: updatedBusiness.address,
          coordinates: updatedBusiness.businessCord,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore aggiornamento profilo business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
