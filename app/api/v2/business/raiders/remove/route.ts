import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

// DELETE - Rimuovi raider dal business
export async function DELETE(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const { raiderId, raiderIds } = body;

    // Supporta sia singolo che array
    let raiderIdsArray: string[];
    if (raiderId) {
      raiderIdsArray = [raiderId];
    } else if (raiderIds && Array.isArray(raiderIds)) {
      raiderIdsArray = raiderIds;
    } else {
      return NextResponse.json(
        { message: "Devi fornire 'raiderId' (singolo) o 'raiderIds' (array)" },
        { status: StatusCodes.BadRequest }
      );
    }

    if (raiderIdsArray.length === 0) {
      return NextResponse.json(
        { message: "Almeno un raider deve essere specificato" },
        { status: StatusCodes.BadRequest }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Elimina relazioni
      await tx.businessRaider.deleteMany({
        where: {
          businessId: auth.business.id,
          raiderId: { in: raiderIdsArray }
        }
      });

      // Aggiorna array raiderActived nel Business
      const newActived = auth.business.raiderActived.filter(
        id => !raiderIdsArray.includes(id)
      );

      await tx.business.update({
        where: { id: auth.business.id },
        data: {
          raiderActived: newActived,
        }
      });

      // Aggiorna array bussinesActived nei Raider
      for (const raiderId of raiderIdsArray) {
        const raider = await tx.raider.findUnique({
          where: { id: raiderId },
          select: { bussinesActived: true }
        });

        if (raider) {
          const newBizActived = raider.bussinesActived.filter(
            id => id !== auth.business.id
          );

          await tx.raider.update({
            where: { id: raiderId },
            data: {
              bussinesActived: newBizActived,
            }
          });
        }
      }
    });

    return NextResponse.json(
      {
        message: `${raiderIdsArray.length} raider rimossi con successo`,
        removedRaiderIds: raiderIdsArray,
      },
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
