import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

// GET - Dettaglio singolo ordine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id },
      include: {
        assignedToRaider: {
          select: {
            id: true,
            name: true,
            surname: true,
            vehicle: true,
            user: {
              select: {
                email: true,
              }
            }
          }
        },
        business: {
          select: {
            id: true,
            bussinesName: true,
          }
        }
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Ordine non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che l'ordine appartenga al business
    if (delivery.businessId !== auth.business.id) {
      return NextResponse.json(
        { message: "Non hai i permessi per visualizzare questo ordine" },
        { status: StatusCodes.Forbidden }
      );
    }

    return NextResponse.json(
      { delivery },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica ordine (solo se non ancora assegnato)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Ordine non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (delivery.businessId !== auth.business.id) {
      return NextResponse.json(
        { message: "Non hai i permessi per modificare questo ordine" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Permetti modifica solo se non assegnato o in stato CREATED
    if (delivery.isAssigned && delivery.status !== "CREATED") {
      return NextResponse.json(
        { message: "Non puoi modificare un ordine già assegnato o in corso" },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // Campi modificabili
    if (body.schedulingDelivery) updateData.schedulingDelivery = new Date(body.schedulingDelivery);
    if (body.note !== undefined) updateData.note = body.note;
    if (body.compensation !== undefined) updateData.compensation = body.compensation;
    if (body.totalPaid !== undefined) updateData.totalPaid = body.totalPaid;
    if (body.mobile) updateData.mobile = body.mobile;
    if (body.phone) updateData.phone = body.phone;

    const updatedDelivery = await prisma.deliveryEA.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "Ordine aggiornato con successo",
        delivery: updatedDelivery
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore aggiornamento delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// DELETE - Cancella ordine (solo se non ancora assegnato)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Ordine non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (delivery.businessId !== auth.business.id) {
      return NextResponse.json(
        { message: "Non hai i permessi per cancellare questo ordine" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Permetti cancellazione solo se non assegnato
    if (delivery.isAssigned) {
      return NextResponse.json(
        { message: "Non puoi cancellare un ordine già assegnato. Contatta il raider per rilasciarlo prima." },
        { status: StatusCodes.BadRequest }
      );
    }

    // Aggiorna stato invece di eliminare (soft delete)
    await prisma.deliveryEA.update({
      where: { id: params.id },
      data: {
        status: "DELETED",
        isCompleted: true,
      }
    });

    return NextResponse.json(
      { message: "Ordine cancellato con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore cancellazione delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
