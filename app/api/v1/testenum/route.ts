import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testSchema } from "@/lib/zod";

// Definizione degli status HTTP
enum StatusCodes {
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = testSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }
    
    // fix data
    const dataToInsert = {
      ...result.data,
      scheduling: result.data.scheduling 
        ? new Date(result.data.scheduling) 
        : undefined,
    };

    const newTest = await prisma.test.create({
      data: dataToInsert,
    });

    return NextResponse.json(newTest, { status: StatusCodes.Created });
  } catch (error) {
    console.error("Errore durante la creazione del record Test", error);
    return NextResponse.json(
      { message: "Errore durante la creazione del record Test" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
