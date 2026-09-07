import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500,
}

// PUT - Annulla il pagamento delle consegne segnate come pagate di un
// raider collegato a questa attività.
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
    const body = await request.json().catch(() => ({}));
    const { dateFrom, dateTo } = body ?? {};

    const relation = await prisma.businessRaider.findFirst({
      where: { businessId: auth.business.id, raiderId },
    });

    if (!relation) {
      return NextResponse.json(
        { message: "Raider non trovato o non collegato alla tua attività" },
        { status: StatusCodes.Forbidden }
      );
    }

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const where: any = {
      assignedToRaiderId: raiderId,
      businessId: auth.business.id,
      status: "COMPLETED",
      raiderPaidAt: { isSet: true, not: null },
    };
    if (dateFrom || dateTo) where.createdAt = dateFilter;

    const result = await prisma.deliveryEA.updateMany({
      where,
      data: { raiderPaidAt: null },
    });

    return NextResponse.json(
      { message: `Annullato il pagamento di ${result.count} consegne`, count: result.count },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore annullamento pagamento raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
