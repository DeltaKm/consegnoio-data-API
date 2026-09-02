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

const updateRaiderSchema = z.object({
  name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  vehicle: z.enum(["CAR", "BICYCLE", "MOTORCYCLE", "VAN", "REFRIGERATEDVAN", "WITHOUTVEHICLE", "TRANSIT"]).optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  imgUrl: z.string().url().optional(),
});

// GET - Dettaglio raider completo
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
    const raider = await prisma.raider.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        businessRelations: {
          include: {
            business: {
              select: {
                id: true,
                bussinesName: true,
                address: true,
              }
            }
          }
        },
        assignedDeliveries: {
          include: {
            delivery: {
              select: {
                id: true,
                orderId: true,
                status: true,
                schedulingDelivery: true,
                business: {
                  select: {
                    bussinesName: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        historyDeliveries: {
          select: {
            deliveryId: true,
          }
        }
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json({ raider }, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore recupero raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica raider (Admin può modificare qualsiasi raider)
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
    const raiderId = params.id;
    const body = await request.json();

    // Validazione
    const validation = updateRaiderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, imgUrl, ...raiderData } = validation.data;

    // Verifica che raider esista
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          }
        }
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Aggiorna in transazione
    await prisma.$transaction(async (tx) => {
      // 1. Aggiorna Raider
      if (Object.keys(raiderData).length > 0) {
        await tx.raider.update({
          where: { id: raiderId },
          data: raiderData,
        });
      }

      // 2. Aggiorna email/imgUrl User se specificati
      if ((email || imgUrl !== undefined) && raider.user) {
        await tx.user.update({
          where: { id: raider.user.id },
          data: {
            ...(email ? { email } : {}),
            ...(imgUrl !== undefined ? { imgUrl } : {}),
          },
        });
      }
    });

    // Fetch raider aggiornato
    const updatedRaider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return NextResponse.json(
      {
        message: "Raider aggiornato con successo",
        raider: {
          id: updatedRaider!.id,
          name: updatedRaider!.name,
          surname: updatedRaider!.surname,
          vehicle: updatedRaider!.vehicle,
          mobile: updatedRaider!.mobile,
          email: updatedRaider!.user?.email,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore modifica raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// DELETE - Elimina completamente raider (Admin only - ATTENZIONE: operazione irreversibile)
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
    const raiderId = params.id;

    // Verifica che raider esista
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        user: true,
        businessRelations: true,
        assignedDeliveries: true,
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che non ci siano consegne attive
    const activeDeliveries = await prisma.assignedDelivery.count({
      where: {
        raiderId: raiderId,
        delivery: {
          status: { in: ["CREATED", "ASSIGNED", "ONDELIVERY"] }
        }
      }
    });

    if (activeDeliveries > 0) {
      return NextResponse.json(
        { 
          message: "Impossibile eliminare il raider. Ha ancora consegne attive.",
          activeDeliveries 
        },
        { status: StatusCodes.BadRequest }
      );
    }

    // Elimina in transazione: relazioni, raider e user
    await prisma.$transaction(async (tx) => {
      // 1. Elimina tutte le relazioni BusinessRaider
      await tx.businessRaider.deleteMany({
        where: { raiderId: raiderId }
      });

      // 2. Elimina AssignedDelivery (storico)
      await tx.assignedDelivery.deleteMany({
        where: { raiderId: raiderId }
      });

      // 3. Elimina HistoryDelivery
      await tx.historyDelivery.deleteMany({
        where: { raiderId: raiderId }
      });

      // 4. Elimina Raider
      await tx.raider.delete({
        where: { id: raiderId }
      });

      // 5. Elimina User associato (se esiste)
      if (raider.user) {
        await tx.user.delete({
          where: { id: raider.user.id }
        });
      }
    });

    return NextResponse.json(
      { 
        message: "Raider e utente eliminati completamente con successo",
        deletedRaider: {
          id: raider.id,
          name: raider.name,
          surname: raider.surname,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore eliminazione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
