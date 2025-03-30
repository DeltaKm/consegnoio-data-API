import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

export async function PATCH(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json({ message: "Utente non autorizzato" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { deliveryId, status } = body;

    if (!deliveryId || !status) {
      return NextResponse.json({ message: "deliveryId e status sono obbligatori" }, { status: 400 });
    }

    const updated = await prisma.deliveryEA.update({
      where: { id: deliveryId },
      data: { status },
    });

    return NextResponse.json({ message: "Stato aggiornato", delivery: updated });
  } catch (error: any) {
    console.error("Errore update-status:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento", error: error.message },
      { status: 500 }
    );
  }
}
