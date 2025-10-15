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

const updateRaiderSchema = z.object({
  name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  vehicle: z.enum(["CAR", "BICYCLE", "MOTORCYCLE", "VAN", "REFRIGERATEDVAN", "WITHOUTVEHICLE", "TRANSIT"]).optional(),
  mobile: z.string().optional(),
});

// GET - Ottieni dati singolo raider della logistica
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
    const raiderId = params.id;

    // Verifica che il raider sia gestito dalla logistica attraverso i business
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    // Recupera il raider con TUTTE le sue relazioni business
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            confirmed: true,
            expired: true,
            role: true,
          }
        },
        businessRelations: {
          where: {
            confirmedFromBusiness: true,
            businessId: { in: businessIds } // Mostra solo i business gestiti dalla logistica
          },
          include: {
            business: {
              select: {
                id: true,
                bussinesName: true,
              }
            }
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

    // Verifica che il raider sia associato ad almeno un business gestito dalla logistica
    if (raider.businessRelations.length === 0) {
      return NextResponse.json(
        { message: "Raider non gestito dai business della tua logistica" },
        { status: StatusCodes.Forbidden }
      );
    }

    return NextResponse.json(
      {
        raider: {
          id: raider.id,
          name: raider.name,
          surname: raider.surname,
          vehicle: raider.vehicle,
          mobile: raider.mobile,
          isActive: raider.isActive,
          inService: raider.inService,
          email: raider.user?.email,
          confirmed: raider.user?.confirmed,
          expired: raider.user?.expired,
          businesses: raider.businessRelations.map(rel => ({
            id: rel.business.id,
            name: rel.business.bussinesName,
            confirmedFromBusiness: rel.confirmedFromBusiness,
            assignedAt: rel.createdAt,
          })),
          totalBusinesses: raider.businessRelations.length,
          createdAt: raider.createdAt,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero raider logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH - Modifica raider della logistica
export async function PATCH(
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
      select: {
        id: true,
        createdByLogisticsId: true,
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica permessi: Logistics può modificare solo raider creati da lui
    if (raider.createdByLogisticsId !== auth.logistics.id) {
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

// DELETE - Rimuovi raider dai business gestiti dalla logistica
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
    const raiderId = params.id;

    // Verifica che il raider sia gestito dalla logistica attraverso i business
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    const businessRaider = await prisma.businessRaider.findFirst({
      where: {
        raiderId: raiderId,
        businessId: { in: businessIds },
      }
    });

    if (!businessRaider) {
      return NextResponse.json(
        { message: "Raider non trovato o non gestito dai business della tua logistica" },
        { status: StatusCodes.NotFound }
      );
    }

    // Verifica che non ci siano consegne attive
    const activeDeliveries = await prisma.assignedDelivery.count({
      where: {
        raiderId: raiderId,
        delivery: {
          businessId: { in: businessIds },
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

    // Rimuovi la relazione BusinessRaider
    await prisma.businessRaider.delete({
      where: { id: businessRaider.id }
    });

    return NextResponse.json(
      { message: "Raider rimosso dal business con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore rimozione raider logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
