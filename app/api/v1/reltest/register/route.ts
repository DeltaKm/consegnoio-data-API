import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { RoleEnum } from "@prisma/client";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role } = body;
    // Se il ruolo non è passato, di default impostiamo RAIDER
    const userRole: RoleEnum = role ?? "USER";

    // Crea l'utente base
    const user = await prisma.user.create({
      data: {
        email,
        password, // In produzione ricorda di hashare la password!
        role: userRole,
      },
    });

    let profile = null;

    // In base al ruolo, crea il profilo corrispondente e collega l'utente
    if (userRole === "RAIDER") {
      profile = await prisma.raider.create({
        data: {
          Name: "NomeDiTest",
          Surname: "CognomeDiTest",
          isActive: false,
          bussinesActived: [],
          inService: false,
          vehicle: "CAR",
          userId: user.id, // collega il Raider all'utente
        },
      });
    } else if (userRole === "BUSINESS") {
      profile = await prisma.business.create({
        data: {
          bussinesName: "Business di Test",
          raiderActived: [],
          address: "Via Test 123",
          userId: user.id, // collega il Business all'utente
        },
      });
    }

    return NextResponse.json(
      { message: "Registrazione avvenuta con successo", user, profile },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
