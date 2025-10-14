import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

const updateBusinessSchema = z.object({
  bussinesName: z.string().min(2).optional(),
  address: z.string().min(2).optional(),
  businessCord: z.string().optional(),
});

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
    const body = await request.json();

    // Validazione
    const validation = updateBusinessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifica che il business sia gestito da questo logistics
    const logisticsBusiness = await prisma.logisticsBusiness.findFirst({
      where: {
        logisticsId: auth.logistics.id,
        businessId: params.id,
      }
    });

    if (!logisticsBusiness) {
      return NextResponse.json(
        { message: "Non hai i permessi per modificare questo business" },
        { status: StatusCodes.Forbidden }
      );
    }

    const { bussinesName, address, businessCord } = validation.data;

    const updatedBusiness = await prisma.business.update({
      where: { id: params.id },
      data: {
        ...(bussinesName && { bussinesName }),
        ...(address && { address }),
        ...(businessCord !== undefined && { businessCord }),
      },
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
