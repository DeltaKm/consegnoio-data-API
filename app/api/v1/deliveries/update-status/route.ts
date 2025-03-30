import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

export async function PATCH(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json({ message: "Utente non autorizzato" }, { status: 401 });
  }

  const userId = decoded.userId;
  const raider = await prisma.raider.findFirst({ where: { userId } });

  if (!raider) {
    return NextResponse.json({ message: "Profilo Raider non trovato" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { deliveryId, status, note } = body;

    if (!deliveryId || !status) {
      return NextResponse.json({ message: "deliveryId e status sono obbligatori" }, { status: 400 });
    }

    // Aggiorna lo stato della consegna
    const updated = await prisma.deliveryEA.update({
      where: { id: deliveryId },
      data: {
        status,
        isCompleted: status === "COMPLETED",
        isAssigned: status === "RELEASED" ? false : undefined,
      },
    });

    // Gestione modelli correlati
    if (status === "COMPLETED") {
      await prisma.historyDelivery.create({
        data: {
          deliveryId,
          raiderId: raider.id,
        },
      });
    }

    if (status === "NOTDELIVERED") {
      await prisma.cancelledDeliveries.create({
        data: {
          deliveryId,
          raiderId: raider.id,
          note: note || "Consegna non effettuata",
        },
      });
    }

    if (status === "RELEASED") {
      await prisma.releasedDelivery.create({
        data: {
          deliveryId,
          raiderId: raider.id,
          note: note || "Rilasciata dal rider",
        },
      });

      await prisma.assignedDelivery.deleteMany({
        where: {
          deliveryId,
          raiderId: raider.id,
        },
      });
    }

    return NextResponse.json({ message: "Stato aggiornato", delivery: updated });
  } catch (error: any) {
    console.error("Errore update-status:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento", error: error.message },
      { status: 500 }
    );
  }
}