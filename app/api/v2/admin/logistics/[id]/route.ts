import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  NotFound = 404,
  BadRequest = 400,
  InternalServerError = 500,
}

// GET - Dettaglio logistics
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
    const logistics = await prisma.logistics.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        businessRelations: {
          include: {
            business: {
              include: {
                deliveries: {
                  select: {
                    status: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json({ logistics }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore recupero logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PUT - Modifica logistics
export async function PUT(
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
    const logistics = await prisma.logistics.findUnique({
      where: { id: params.id }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.surname) updateData.surname = body.surname;

    const updatedLogistics = await prisma.logistics.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "Logistics aggiornato con successo",
        logistics: updatedLogistics
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore aggiornamento logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// DELETE - Disabilita logistics
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
    const logistics = await prisma.logistics.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Disabilita l'utente associato
    if (logistics.userId) {
      await prisma.user.update({
        where: { id: logistics.userId },
        data: { expired: true }
      });
    }

    return NextResponse.json(
      { message: "Logistics disabilitato con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore disabilitazione logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
