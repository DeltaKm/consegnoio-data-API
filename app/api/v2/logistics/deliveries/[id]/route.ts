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

const updateDeliverySchema = z.object({
  status: z.enum(["CREATED", "RELEASED", "ASSIGNED", "ONDELIVERY", "COMPLETED", "NOTDELIVERED", "DELETED"]).optional(),
  schedulingDelivery: z.string().optional(),
  compensation: z.number().optional(),
  assignedToRaiderId: z.string().nullable().optional(),
});

// GET - Dettaglio delivery
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
    // Ottieni business gestiti dal logistics
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    if (businessIds.length === 0) {
      return NextResponse.json(
        { message: "Nessun business gestito" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Recupera delivery
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id },
      include: {
        business: {
          select: {
            id: true,
            bussinesName: true,
            address: true,
          }
        },
        assignedToRaider: {
          select: {
            id: true,
            name: true,
            surname: true,
            vehicle: true,
            mobile: true,
          }
        },
        assignedDeliveries: {
          include: {
            raider: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
        },
        historyDeliveries: {
          include: {
            raider: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
        }
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Delivery non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che la delivery appartenga a un business gestito
    if (!delivery.businessId || !businessIds.includes(delivery.businessId)) {
      return NextResponse.json(
        { message: "Non hai i permessi per visualizzare questa delivery" },
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

// PUT - Modifica delivery
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
    const validation = updateDeliverySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    // Ottieni business gestiti dal logistics
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    if (businessIds.length === 0) {
      return NextResponse.json(
        { message: "Nessun business gestito" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Verifica che delivery esista
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Delivery non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che la delivery appartenga a un business gestito
    if (!delivery.businessId || !businessIds.includes(delivery.businessId)) {
      return NextResponse.json(
        { message: "Non hai i permessi per modificare questa delivery" },
        { status: StatusCodes.Forbidden }
      );
    }

    const { status, schedulingDelivery, compensation, assignedToRaiderId } = validation.data;

    // Aggiorna delivery
    const updatedDelivery = await prisma.deliveryEA.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(schedulingDelivery && { schedulingDelivery: new Date(schedulingDelivery) }),
        ...(compensation !== undefined && { compensation }),
        ...(assignedToRaiderId !== undefined && { assignedToRaiderId }),
      },
      include: {
        business: {
          select: {
            id: true,
            bussinesName: true,
          }
        },
        assignedToRaider: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        }
      }
    });

    return NextResponse.json(
      {
        message: "Delivery aggiornata con successo",
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

// DELETE - Elimina delivery (soft delete)
export async function DELETE(
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
    // Ottieni business gestiti dal logistics
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    if (businessIds.length === 0) {
      return NextResponse.json(
        { message: "Nessun business gestito" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Verifica che delivery esista
    const delivery = await prisma.deliveryEA.findUnique({
      where: { id: params.id }
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Delivery non trovata" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che la delivery appartenga a un business gestito
    if (!delivery.businessId || !businessIds.includes(delivery.businessId)) {
      return NextResponse.json(
        { message: "Non hai i permessi per eliminare questa delivery" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Soft delete (cambia status a DELETED)
    await prisma.deliveryEA.update({
      where: { id: params.id },
      data: { status: "DELETED" }
    });

    return NextResponse.json(
      { message: "Delivery eliminata con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore eliminazione delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
