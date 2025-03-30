import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Utente non autorizzato" },
      { status: 401 }
    );
  }

  const userId = decoded.userId;

  const raider = await prisma.raider.findFirst({ where: { userId } });
  if (!raider) {
    return NextResponse.json(
      { message: "Profilo Raider non trovato" },
      { status: 404 }
    );
  }

  try {
    const releasedDeliveries = await prisma.releasedDelivery.findMany({
      where: { raiderId: raider.id },
      include: { delivery: true },
      orderBy: { createdAt: "desc" },
    });

    const uniqueMap = new Map();

    for (const entry of releasedDeliveries) {
      const deliveryId = entry.delivery.id;
      if (!uniqueMap.has(deliveryId)) {
        uniqueMap.set(deliveryId, {
          ...entry.delivery,
          note: entry.note,
          releasedAt: entry.createdAt,
        });
      }
    }

    const deliveries = Array.from(uniqueMap.values());

    return NextResponse.json(deliveries);
  } catch (error: any) {
    console.error("Errore nel recupero delle consegne rilasciate:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: 500 }
    );
  }
}
