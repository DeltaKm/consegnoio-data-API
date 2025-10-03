import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRole } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Ottieni info utente autenticato
export async function GET(request: NextRequest) {
  const auth = await authenticateWithRole(request);
  
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato" },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    let profile = null;

    // Prepara profilo in base al ruolo
    if (auth.role === "BUSINESS" && auth.user.businessProfiles.length > 0) {
      profile = {
        type: "business",
        id: auth.user.businessProfiles[0].id,
        name: auth.user.businessProfiles[0].bussinesName,
        address: auth.user.businessProfiles[0].address,
      };
    } else if (auth.role === "RAIDER" && auth.user.raiderProfiles.length > 0) {
      profile = {
        type: "raider",
        id: auth.user.raiderProfiles[0].id,
        name: auth.user.raiderProfiles[0].name,
        surname: auth.user.raiderProfiles[0].surname,
      };
    } else if (auth.role === "LOGISTICS" && auth.user.logisticsProfiles.length > 0) {
      profile = {
        type: "logistics",
        id: auth.user.logisticsProfiles[0].id,
        name: auth.user.logisticsProfiles[0].name,
        surname: auth.user.logisticsProfiles[0].surname,
      };
    }

    return NextResponse.json(
      {
        user: {
          id: auth.user.id,
          email: auth.user.email,
          role: auth.role,
          confirmed: auth.user.confirmed,
        },
        profile,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero utente:", error);
    return NextResponse.json(
      { message: "Errore interno" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
