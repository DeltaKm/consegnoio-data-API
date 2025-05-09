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
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json({ message: "Invalid API key" }, { status: StatusCodes.Unauthorized });
  }
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json({ message: "Unauthorized" }, { status: StatusCodes.Unauthorized });
  }

  const { raiderId, title, body, data } = await request.json();
  if (!raiderId || !title || !body) {
    return NextResponse.json(
      { message: "Fields 'raiderId', 'title' and 'body' are required." },
      { status: StatusCodes.BadRequest }
    );
  }

  const raider = await prisma.raider.findUnique({
    where: { id: raiderId },
    select: { deviceTokens: true },
  });
  if (!raider) {
    return NextResponse.json({ message: "Raider not found." }, { status: StatusCodes.NotFound });
  }
  if (!raider.deviceTokens.length) {
    return NextResponse.json(
      { message: "No device tokens registered for this raider." },
      { status: StatusCodes.NotFound }
    );
  }

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
}
