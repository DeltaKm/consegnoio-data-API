import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
  Success = 200,
}

export async function POST(request: NextRequest) {
  // ——————————————————————————————————————————————————
  // 1) Autenticazione via JWT (middleware API‐Key già eseguito)
  // ——————————————————————————————————————————————————
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: StatusCodes.Unauthorized }
    );
  }

  // ——————————————————————————————————————————————————
  // 2) Parsing e validazione del body JSON
  // ——————————————————————————————————————————————————
  const { raiderId, title, body, data } = await request.json();
  if (!raiderId || !title || !body) {
    return NextResponse.json(
      { message: "Fields 'raiderId', 'title' and 'body' are required." },
      { status: StatusCodes.BadRequest }
    );
  }

  // ——————————————————————————————————————————————————
  // 3) Recupero i token FCM dal DB
  // ——————————————————————————————————————————————————
  const raider = await prisma.raider.findUnique({
    where: { id: raiderId },
    select: { deviceTokens: true },
  });
  if (!raider) {
    return NextResponse.json(
      { message: "Raider not found." },
      { status: StatusCodes.NotFound }
    );
  }
  if (!raider.deviceTokens.length) {
    return NextResponse.json(
      { message: "No device tokens registered for this raider." },
      { status: StatusCodes.NotFound }
    );
  }

  // ——————————————————————————————————————————————————
  // 4) Invia la notifica
  // ——————————————————————————————————————————————————
  try {
    const { successCount, failureCount, results } = await sendNotification(
      raiderId,
      raider.deviceTokens,
      title,
      body,
      data
    );

    return NextResponse.json(
      { successCount, failureCount, results },
      { status: StatusCodes.Success }
    );

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { message: "Internal error sending notification", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
