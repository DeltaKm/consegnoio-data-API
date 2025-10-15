import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

const updateRaiderSchema = z.object({
  name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  vehicle: z.enum(["CAR", "BICYCLE", "MOTORCYCLE", "VAN", "REFRIGERATEDVAN", "WITHOUTVEHICLE", "TRANSIT"]).optional(),
  mobile: z.string().optional(),
});

// GET - Ottieni dati singolo raider del business
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
    const raiderId = params.id;

    // Verifica che il raider sia associato al business
    const businessRaider = await prisma.businessRaider.findFirst({
      where: {
        raiderId: raiderId,
        businessId: auth.business.id,
      },
      include: {
        raider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                confirmed: true,
                expired: true,
                role: true,
              }
            }
          }
        }
      }
    });

    if (!businessRaider) {
      return NextResponse.json(
        { message: "Raider non trovato o non associato al tuo business" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json(
      {
        raider: {
          id: businessRaider.raider.id,
          name: businessRaider.raider.name,
          surname: businessRaider.raider.surname,
          vehicle: businessRaider.raider.vehicle,
          mobile: businessRaider.raider.mobile,
          user: businessRaider.raider.user,
          confirmedFromBusiness: businessRaider.confirmedFromBusiness,
          createdAt: businessRaider.createdAt,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica raider del business
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

    // Verifica che raider esista
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        businessRelations: {
          where: { businessId: auth.business.id }
        }
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica permessi: Business può modificare solo raider creati da lui o assegnati
    const canModify = 
      raider.createdByBusinessId === auth.business.id || // Creato da questo business
      raider.businessRelations.length > 0; // Assegnato a questo business

    if (!canModify) {
      return NextResponse.json(
        { message: "Non hai i permessi per modificare questo raider" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Aggiorna raider
    const updatedRaider = await prisma.raider.update({
      where: { id: raiderId },
      data: validation.data,
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
          id: updatedRaider.id,
          name: updatedRaider.name,
          surname: updatedRaider.surname,
          vehicle: updatedRaider.vehicle,
          mobile: updatedRaider.mobile,
          email: updatedRaider.user?.email,
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

// DELETE - Rimuovi raider dal business (non elimina l'utente, solo la relazione)
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
    const raiderId = params.id;

    // Verifica che la relazione esista
    const businessRaider = await prisma.businessRaider.findFirst({
      where: {
        raiderId: raiderId,
        businessId: auth.business.id,
      }
    });

    if (!businessRaider) {
      return NextResponse.json(
        { message: "Raider non trovato o non associato al tuo business" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che non ci siano consegne attive
    const activeDeliveries = await prisma.assignedDelivery.count({
      where: {
        raiderId: raiderId,
        delivery: {
          businessId: auth.business.id,
          status: { in: ["CREATED", "ASSIGNED", "ONDELIVERY"] }
        }
      }
    });

    if (activeDeliveries > 0) {
      return NextResponse.json(
        { 
          message: "Impossibile rimuovere il raider. Ha ancora consegne attive.",
          activeDeliveries 
        },
        { status: StatusCodes.BadRequest }
      );
    }

    // Rimuovi solo la relazione BusinessRaider
    await prisma.businessRaider.delete({
      where: { id: businessRaider.id }
    });

    return NextResponse.json(
      { message: "Raider rimosso dal business con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore rimozione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
