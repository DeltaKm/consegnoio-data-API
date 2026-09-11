import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Forbidden = 403,
  InternalServerError = 500,
}

const syncBusinessesSchema = z.object({
  businessIds: z.array(z.string()),
});

// PATCH - Sincronizza le attività (tra quelle gestite dalla logistica) a cui
// un raider è collegato. A differenza dell'endpoint Admin, non è un replace
// totale: tocca solo le relazioni verso business gestiti da QUESTA logistica,
// senza toccare eventuali collegamenti verso business di altre logistiche.
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

    const validation = syncBusinessesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { businessIds } = validation.data;

    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });
    const managedBusinessIds = businessesManaged.map((lb) => lb.businessId);

    const notManaged = businessIds.filter((id) => !managedBusinessIds.includes(id));
    if (notManaged.length > 0) {
      return NextResponse.json(
        { message: "Non gestisci questi business", notManagedBusinessIds: notManaged },
        { status: StatusCodes.BadRequest }
      );
    }

    const raider = await prisma.raider.findFirst({
      where: {
        id: raiderId,
        // Oltre ai raider già collegati a un'attività gestita, permette
        // l'accesso anche a quelli creati da questa logistica ma
        // attualmente senza nessuna attività assegnata — altrimenti,
        // una volta rimossa l'ultima, non sarebbe più possibile
        // riassegnargliene una da qui.
        OR: [
          { businessRelations: { some: { businessId: { in: managedBusinessIds } } } },
          { createdByLogisticsId: auth.logistics.id },
        ],
      },
      include: {
        businessRelations: {
          where: { businessId: { in: managedBusinessIds } },
          select: { businessId: true },
        }
      }
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato o non collegato alle tue attività" },
        { status: StatusCodes.Forbidden }
      );
    }

    const currentManagedIds = raider.businessRelations.map((r) => r.businessId);
    const toAdd = businessIds.filter((id) => !currentManagedIds.includes(id));
    const toRemove = currentManagedIds.filter((id) => !businessIds.includes(id));

    await prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.businessRaider.deleteMany({
          where: { raiderId, businessId: { in: toRemove } }
        });
      }
      if (toAdd.length > 0) {
        for (const businessId of toAdd) {
          await tx.businessRaider.upsert({
            where: { businessId_raiderId: { businessId, raiderId } },
            update: {},
            create: { businessId, raiderId, confirmedFromBusiness: true },
          });
        }
      }
    });

    // Aggiorna gli array denormalizzati (best-effort)
    try {
      const freshRaider = await prisma.raider.findUnique({
        where: { id: raiderId },
        select: { bussinesActived: true }
      });
      if (freshRaider) {
        const outsideManaged = freshRaider.bussinesActived.filter(
          (id) => !managedBusinessIds.includes(id)
        );
        await prisma.raider.update({
          where: { id: raiderId },
          data: { bussinesActived: Array.from(new Set([...outsideManaged, ...businessIds])) }
        });
      }

      if (toRemove.length > 0) {
        const businessesToUpdate = await prisma.business.findMany({
          where: { id: { in: toRemove } },
          select: { id: true, raiderActived: true }
        });
        for (const business of businessesToUpdate) {
          await prisma.business.update({
            where: { id: business.id },
            data: { raiderActived: business.raiderActived.filter((id) => id !== raiderId) }
          });
        }
      }

      if (toAdd.length > 0) {
        const businessesToUpdate = await prisma.business.findMany({
          where: { id: { in: toAdd } },
          select: { id: true, raiderActived: true }
        });
        for (const business of businessesToUpdate) {
          await prisma.business.update({
            where: { id: business.id },
            data: { raiderActived: Array.from(new Set([...business.raiderActived, raiderId])) }
          });
        }
      }
    } catch (arrayUpdateError) {
      console.error("Errore aggiornamento array (non critico):", arrayUpdateError);
    }

    return NextResponse.json(
      {
        message: "Attività sincronizzate con successo",
        raiderId,
        currentBusinessIds: businessIds,
        added: toAdd.length,
        removed: toRemove.length,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore sincronizzazione attività raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
