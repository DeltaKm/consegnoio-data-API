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

// PUT - Modifica raider (Admin può modificare qualsiasi raider)
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

    const { email, ...raiderData } = validation.data;

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

      // 2. Aggiorna email User se specificata
      if (email && raider.user) {
        await tx.user.update({
          where: { id: raider.user.id },
          data: { email },
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
