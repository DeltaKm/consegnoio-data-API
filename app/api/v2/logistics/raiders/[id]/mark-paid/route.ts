import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500,
}

// PUT - Segna come pagate le consegne completate e non ancora pagate di un
// raider, solo tra le attività gestite da questa logistica.
export async function PUT(
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
    const body = await request.json().catch(() => ({}));
    const { dateFrom, dateTo, businessId } = body ?? {};

    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true },
    });
    const managedBusinessIds = businessesManaged.map(lb => lb.businessId);

    if (businessId && !managedBusinessIds.includes(businessId)) {
      return NextResponse.json(
        { message: "Non gestisci questa attività" },
        { status: StatusCodes.BadRequest }
      );
    }

    const raider = await prisma.raider.findFirst({
      where: {
        id: raiderId,
        businessRelations: { some: { businessId: { in: managedBusinessIds } } },
      },
      select: { id: true },
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato o non collegato alle tue attività" },
        { status: StatusCodes.Forbidden }
      );
    }

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const scopedBusinessIds = businessId ? [businessId] : managedBusinessIds;

    const where: any = {
      assignedToRaiderId: raiderId,
      status: "COMPLETED",
      raiderPaidAt: { isSet: false },
      businessId: { in: scopedBusinessIds },
    };
    if (dateFrom || dateTo) where.createdAt = dateFilter;

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
