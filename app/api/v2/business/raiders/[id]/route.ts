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

// PUT - Modifica raider del business
export async function PUT(
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
