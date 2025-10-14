import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
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
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
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

// PATCH - Modifica delivery (Admin può modificare qualsiasi campo)
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
    const body = await request.json();

    // Validazione
    const validation = updateDeliverySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
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

    const { status, schedulingDelivery, compensation, assignedToRaiderId } = validation.data;

    // Aggiorna delivery
    const updateData: any = {
      ...(status && { status }),
      ...(schedulingDelivery && { schedulingDelivery: new Date(schedulingDelivery) }),
      ...(compensation !== undefined && { compensation }),
      ...(assignedToRaiderId !== undefined && { assignedToRaiderId }),
    };

    // Gestione stati speciali
    if (status === "COMPLETED") {
      updateData.isCompleted = true;
    }

    if (status === "RELEASED") {
      updateData.isAssigned = false;
      updateData.assignedToRaiderId = null;
    }

    const updatedDelivery = await prisma.deliveryEA.update({
      where: { id: params.id },
      data: updateData,
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

    // Gestione record storici
    if (status === "COMPLETED" && delivery.assignedToRaiderId) {
      await prisma.historyDelivery.create({
        data: {
          deliveryId: params.id,
          raiderId: delivery.assignedToRaiderId,
        },
      });
    }

    if (status === "NOTDELIVERED" && delivery.assignedToRaiderId) {
      await prisma.cancelledDeliveries.create({
        data: {
          deliveryId: params.id,
          raiderId: delivery.assignedToRaiderId,
          note: "Consegna non effettuata",
        },
      });
    }

    if (status === "RELEASED" && delivery.assignedToRaiderId) {
      await prisma.releasedDelivery.create({
        data: {
          deliveryId: params.id,
          raiderId: delivery.assignedToRaiderId,
          note: "Rilasciata dall'admin",
        },
      });

      await prisma.assignedDelivery.deleteMany({
        where: {
          deliveryId: params.id,
          raiderId: delivery.assignedToRaiderId,
        },
      });
    }

    if (status === "DELETED" && delivery.assignedToRaiderId) {
      await prisma.cancelledDeliveries.create({
        data: {
          deliveryId: params.id,
          raiderId: delivery.assignedToRaiderId,
          note: "Consegna cancellata dall'admin",
        },
      });
    }

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

// DELETE - Elimina delivery (hard delete)
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

    // Elimina in transazione (rimuove anche relazioni)
    await prisma.$transaction(async (tx) => {
      // Elimina AssignedDelivery
      await tx.assignedDelivery.deleteMany({
        where: { deliveryId: params.id }
      });

      // Elimina HistoryDelivery
      await tx.historyDelivery.deleteMany({
        where: { deliveryId: params.id }
      });

      // Elimina CancelledDeliveries
      await tx.cancelledDeliveries.deleteMany({
        where: { deliveryId: params.id }
      });

      // Elimina ReleasedDelivery
      await tx.releasedDelivery.deleteMany({
        where: { deliveryId: params.id }
      });

      // Elimina Delivery
      await tx.deliveryEA.delete({
        where: { id: params.id }
      });
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
