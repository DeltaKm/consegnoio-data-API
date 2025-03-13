import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const raiderId = request.nextUrl.searchParams.get("raiderId");
  if (!raiderId) {
    return NextResponse.json(
      { message: "Missing raiderId query parameter" },
      { status: 400 }
    );
  }
  try {
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      include: {
        businessRelations: true,
        user: true,
      },
    });
    if (!raider) {
      return NextResponse.json({ message: "Raider not found" }, { status: 404 });
    }
    return NextResponse.json(raider, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching raider:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
