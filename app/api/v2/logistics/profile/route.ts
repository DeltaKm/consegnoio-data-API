import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  surname: z.string().min(2).optional(),
});

// GET - Ottieni profilo logistics
export async function GET(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const logistics = await prisma.logistics.findUnique({
      where: { id: auth.logistics.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            confirmed: true,
            expired: true,
          }
        },
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
        }
      }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Profilo logistics non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    return NextResponse.json(
      {
        logistics: {
          id: logistics.id,
          name: logistics.name,
          surname: logistics.surname,
          email: logistics.user?.email,
          confirmed: logistics.user?.confirmed,
          expired: logistics.user?.expired,
          businesses: logistics.businessRelations.map((rel: any) => ({
            id: rel.business.id,
            name: rel.business.bussinesName,
            address: rel.business.address,
            assignedAt: rel.creatdeAt,
          })),
          totalBusinesses: logistics.businessRelations.length,
          createdAt: logistics.createdAt,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero profilo logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica profilo logistics
export async function PATCH(request: NextRequest) {
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
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { name, surname } = validation.data;

    // Aggiorna profilo logistics
    const updatedLogistics = await prisma.logistics.update({
      where: { id: auth.logistics.id },
      data: {
        ...(name && { name }),
        ...(surname && { surname }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            confirmed: true,
          }
        }
      }
    });

    return NextResponse.json(
      {
        message: "Profilo aggiornato con successo",
        logistics: {
          id: updatedLogistics.id,
          name: updatedLogistics.name,
          surname: updatedLogistics.surname,
          email: updatedLogistics.user?.email,
          confirmed: updatedLogistics.user?.confirmed,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore aggiornamento profilo logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
