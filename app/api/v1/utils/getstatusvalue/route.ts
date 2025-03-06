import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

enum StatusCodes {
    Success = 200,
    NotFound = 404,
    InternalServerError = 500,
  }

export async function GET() {
    try {
      const statusValue = await prisma.statusValue.findMany({
        orderBy: { label: "asc" },
        select: {
            label: true,
            value: true,
          },
      });
      return NextResponse.json(statusValue, { status: StatusCodes.Success });
  
    } catch (error) {
      console.error("Errore durante il fetch delle consegne", error);
      return NextResponse.json(
        { message: "Errore durante il fetch delle consegne" },
        { status: StatusCodes.InternalServerError }
      );
    }
  }
