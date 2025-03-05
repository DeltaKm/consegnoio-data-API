import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createStatusValueSchema = z.object({  
    label: z.string(),
    value: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStatusValueSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const { label, value } = parsed.data;
    
    const newStatusValue = await prisma.statusValue.create({
      data: { label, value },
    });
    
    return NextResponse.json(newStatusValue, { status: 201 });
  } catch (error) {
    console.error("Errore durante la creazione del record StatusValue", error);
    return NextResponse.json(
      { message: "Errore durante la creazione del record StatusValue" },
      { status: 500 }
    );
  }
}
