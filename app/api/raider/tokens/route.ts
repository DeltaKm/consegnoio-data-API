// app/api/v1/raider/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { authenticateToken } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const decoded = await authenticateToken(req);
  if (!decoded) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = decoded.userId as string;

  const raider = await prisma.raider.findFirst({
    where: { userId },
    select: { deviceTokens: true },
  });
  if (!raider) {
    return NextResponse.json({ message: 'Raider not found' }, { status: 404 });
  }

  return NextResponse.json(
    { tokens: raider.deviceTokens },
    { status: 200 }
  );
}
