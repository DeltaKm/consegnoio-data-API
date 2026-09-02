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

const syncLogisticsSchema = z.object({
  logisticsIds: z.array(z.string()),
});

// PATCH - Sincronizza le logistiche assegnate a questo business (visto dal lato Business)
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
    const businessId = params.id;
    const body = await request.json();

    const validation = syncLogisticsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { logisticsIds } = validation.data;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        logisticsRelations: { select: { logisticsId: true } }
      }
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (logisticsIds.length > 0) {
      const logisticsList = await prisma.logistics.findMany({
        where: { id: { in: logisticsIds } },
        select: { id: true }
      });

      if (logisticsList.length !== logisticsIds.length) {
        const foundIds = logisticsList.map(l => l.id);
        const notFound = logisticsIds.filter(id => !foundIds.includes(id));
        return NextResponse.json(
          {
            message: "Alcune logistiche non esistono",
            notFoundLogisticsIds: notFound
          },
          { status: StatusCodes.NotFound }
        );
      }
    }

    const currentLogisticsIds = business.logisticsRelations.map(rel => rel.logisticsId);
    const logisticsToAdd = logisticsIds.filter(id => !currentLogisticsIds.includes(id));
    const logisticsToRemove = currentLogisticsIds.filter(id => !logisticsIds.includes(id));

    await prisma.$transaction(async (tx) => {
      if (logisticsToRemove.length > 0) {
        await tx.logisticsBusiness.deleteMany({
          where: {
            businessId,
            logisticsId: { in: logisticsToRemove }
          }
        });
      }

      if (logisticsToAdd.length > 0) {
        for (const logisticsId of logisticsToAdd) {
          await tx.logisticsBusiness.create({
            data: { logisticsId, businessId }
          });
        }
      }
    });

    return NextResponse.json(
      {
        message: "Logistiche sincronizzate con successo",
        businessId,
        currentLogisticsIds: logisticsIds,
        added: logisticsToAdd.length,
        removed: logisticsToRemove.length,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore sincronizzazione logistiche del business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
