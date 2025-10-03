import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

// DELETE - Rimuovi business da logistics
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const { logisticsId, businessIds } = body;

    if (!logisticsId || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json(
        { message: "logisticsId e businessIds (array) sono obbligatori" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Elimina le relazioni
    await prisma.logisticsBusiness.deleteMany({
      where: {
        logisticsId,
        businessId: { in: businessIds }
      }
    });

    return NextResponse.json(
      {
        message: `Business rimossi dal logistics`,
        logisticsId,
        removedBusinessIds: businessIds
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore rimozione business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
