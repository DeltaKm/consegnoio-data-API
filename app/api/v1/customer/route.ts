import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { customerSchema,type CustomerSchema } from "@/lib/zod";




enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

// GET: Recupera tutti gli utenti
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customers, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante il fetch degli utenti", error);
    return NextResponse.json(
      { message: "Errore durante il fetch degli utenti" },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST: Crea un nuovo utente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = customerSchema.safeParse(body);
     

    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const data = result.data;

    const newCustomer = await prisma.customer.create({ 
      data: {
      name: data.name,
      tel: data.tel,
      address: data.address,       
    },
   });
   
    return NextResponse.json(newCustomer, { status: StatusCodes.Created });
  } catch (error) {
    console.error("Errore durante la creazione dell'utente", error);
    return NextResponse.json(
      { message: "Errore durante la creazione dell'utente" },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// DELETE: Elimina un utente specifico
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const deletedCustomer = await prisma.customer.delete({ where: { id } });

    return NextResponse.json(deletedCustomer, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'utente", error);
    return NextResponse.json(
      { message: "Errore durante l'eliminazione dell'utente" },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// PATCH: Aggiorna un utente
export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = await request.json();
    const result = customerSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const data = result.data;
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedCustomer, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'utente", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'utente" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
