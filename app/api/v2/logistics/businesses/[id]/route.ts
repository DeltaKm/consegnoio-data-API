import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// GET - Dettaglio business
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            confirmed: true,
            creatdeAt: true,
          }
        },
        raiderRelations: {
          include: {
            raider: {
              select: {
                id: true,
                name: true,
                surname: true,
                vehicle: true,
                isActive: true,
              }
            }
          }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            compensation: true,
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 10,
        }
      }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json(
      { business },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PUT - Modifica business
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: params.id }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.bussinesName) updateData.bussinesName = body.bussinesName;
    if (body.address) updateData.address = body.address;
    if (body.businessCord !== undefined) updateData.businessCord = body.businessCord;

    const updatedBusiness = await prisma.business.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "Business aggiornato con successo",
        business: updatedBusiness
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore aggiornamento business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
