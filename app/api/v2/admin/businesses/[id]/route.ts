import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// GET - Dettaglio business completo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        raiderRelations: {
          include: {
            raider: {
              include: {
                user: {
                  select: {
                    email: true,
                  }
                }
              }
            }
          }
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        logisticsRelations: {
          include: {
            logistics: {
              include: {
                user: {
                  select: {
                    email: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json({ business }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore recupero business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica business
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
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

    if (body.imgUrl !== undefined && business.userId) {
      await prisma.user.update({
        where: { id: business.userId },
        data: { imgUrl: body.imgUrl },
      });
    }

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

// DELETE - Disabilita business (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Disabilita l'utente associato
    if (business.userId) {
      await prisma.user.update({
        where: { id: business.userId },
        data: { expired: true }
      });
    }

    return NextResponse.json(
      { message: "Business disabilitato con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore disabilitazione business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
