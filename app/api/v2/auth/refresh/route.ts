import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import jwt from "jsonwebtoken";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Token mancante" },
        { status: StatusCodes.Unauthorized }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { message: "Token non valido" },
        { status: StatusCodes.Unauthorized }
      );
    }

    // Verifica token (anche se scaduto, per ottenere userId)
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      // Se token scaduto, prova a decodificarlo senza verifica
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return NextResponse.json(
          { message: "Token non valido" },
          { status: StatusCodes.Unauthorized }
        );
      }
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: "Token non valido" },
        { status: StatusCodes.Unauthorized }
      );
    }

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        raiderProfiles: true,
        businessProfiles: true,
        logisticsProfiles: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: StatusCodes.Unauthorized }
      );
    }

    if (user.expired) {
      return NextResponse.json(
        { message: "Account disabilitato" },
        { status: StatusCodes.Unauthorized }
      );
    }

    // Genera nuovo token
    const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);

    // Aggiorna token nel database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenJWT: newToken,
        expirationJWT: expiration,
        expired: false,
      },
    });

    // Prepara profilo in base al ruolo
    let profile = null;
    if (user.role === "BUSINESS" && user.businessProfiles.length > 0) {
      profile = {
        type: "business",
        id: user.businessProfiles[0].id,
        name: user.businessProfiles[0].bussinesName,
        address: user.businessProfiles[0].address,
      };
    } else if (user.role === "RAIDER" && user.raiderProfiles.length > 0) {
      profile = {
        type: "raider",
        id: user.raiderProfiles[0].id,
        name: user.raiderProfiles[0].name,
        surname: user.raiderProfiles[0].surname,
      };
    } else if (user.role === "LOGISTICS" && user.logisticsProfiles.length > 0) {
      profile = {
        type: "logistics",
        id: user.logisticsProfiles[0].id,
        name: user.logisticsProfiles[0].name,
        surname: user.logisticsProfiles[0].surname,
      };
    }

    return NextResponse.json(
      {
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore refresh token:", error);
    return NextResponse.json(
      { message: "Errore interno durante il refresh" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
