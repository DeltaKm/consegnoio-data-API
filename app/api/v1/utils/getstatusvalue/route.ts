import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const statusValues = await prisma.statusValue.findMany({
      select: {
        label: true,
        value: true,
      },
    });

    const responseData: Record<string, string> = statusValues.reduce((acc, curr) => {
      acc[curr.label] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Errore nel recuperare gli status value", error);
    return NextResponse.json(
      { message: "Errore nel recuperare gli status value" },
      { status: 500 }
    );
  }
}
