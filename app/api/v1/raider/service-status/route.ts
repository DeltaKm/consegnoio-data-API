
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/app/lib/auth";

/**
 * PATCH /api/v1/raider/service-status
 * Aggiorna lo stato inService di un raider
 * 
 * Query parameter: raiderId
 * Body: { inService: boolean }
 * 
 * Richiede autenticazione
 */
export async function PATCH(request: NextRequest) {
  try {
    const decoded = await authenticateToken(request);
    if (!decoded) {
      return NextResponse.json(
        { message: "Utente non autorizzato" },
        { status: 401 }
      );
    }
    
    const userId = decoded.userId;

    const raiderId = request.nextUrl.searchParams.get("raiderId");
    if (!raiderId) {
      return NextResponse.json(
        { message: "ID raider mancante (parametro di query 'raiderId' richiesto)" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    if (typeof body.inService !== 'boolean') {
      return NextResponse.json(
        { message: "Il campo 'inService' deve essere un valore booleano" },
        { status: 400 }
      );
    }

   
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
    });

    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: 404 }
      );
    }

   
    if (raider.userId !== userId) {
      return NextResponse.json(
        { message: "Non sei autorizzato a modificare questo raider" },
        { status: 403 }
      );
    }

    const updatedRaider = await prisma.raider.update({
      where: { id: raiderId },
      data: {
        inService: body.inService,
        updateAt: new Date(), 
      },
    });

    return NextResponse.json(updatedRaider, { status: 200 });
  } catch (error: any) {
    console.error("Errore durante l'aggiornamento dello stato del raider:", error);
    return NextResponse.json(
      { message: error.message || "Si è verificato un errore interno" },
      { status: 500 }
    );
  }
}