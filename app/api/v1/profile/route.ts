import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Per test, passiamo il userId come query parameter: ?userId=...
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { message: "Missing userId query parameter" },
        { status: 400 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { raiderProfiles: true },
    });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { message: "Internal error", error: error.message },
      { status: 500 }
    );
  }
}
