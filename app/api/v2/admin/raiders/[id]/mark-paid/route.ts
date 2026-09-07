import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

// PUT - Segna come pagate le consegne completate e non ancora pagate di un
// raider, nello stesso scope (data/attività/logistica) usato dalle statistiche.
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
    const body = await request.json().catch(() => ({}));
    const { dateFrom, dateTo, businessId, logisticsId } = body ?? {};

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    let scopedBusinessIds: string[] | null = null;
    if (logisticsId) {
      const rels = await prisma.logisticsBusiness.findMany({
        where: { logisticsId },
        select: { businessId: true },
      });
      const managedIds = rels.map(r => r.businessId);
      if (businessId && !managedIds.includes(businessId)) {
        return NextResponse.json(
          { message: "Questa attività non è gestita da questa logistica" },
          { status: StatusCodes.BadRequest }
        );
      }
      scopedBusinessIds = businessId ? [businessId] : managedIds;
    } else if (businessId) {
      scopedBusinessIds = [businessId];
    }

    const where: any = {
      assignedToRaiderId: raiderId,
      status: "COMPLETED",
      raiderPaidAt: { isSet: false },
    };
    if (dateFrom || dateTo) where.createdAt = dateFilter;
    if (scopedBusinessIds) where.businessId = { in: scopedBusinessIds };

    const result = await prisma.deliveryEA.updateMany({
      where,
      data: { raiderPaidAt: new Date() },
    });

    return NextResponse.json(
      { message: `Segnate come pagate ${result.count} consegne`, count: result.count },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore segnalazione pagamento raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
