// app/api/raider/register-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { authenticateToken } from '@/app/lib/auth';

export async function POST(req: NextRequest) {
  const decoded = await authenticateToken(req);
  if (!decoded) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = decoded.userId as string;

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const raider = await prisma.raider.findFirst({
    where: { userId },
    select: { id: true, deviceTokens: true },
  });
  if (!raider) {
    return NextResponse.json({ message: 'Raider not found' }, { status: 404 });
  }

  const existing = raider.deviceTokens || [];
  let updatedTokens = existing;
  if (!existing.includes(token)) {
    updatedTokens = [...existing, token];
    await prisma.raider.update({
      where: { id: raider.id },
      data: {
        deviceTokens: { set: updatedTokens },
      },
    });
  }

  return NextResponse.json(
    {
      message: existing.includes(token)
        ? 'Token already registered'
        : 'Token registered',
      deviceTokens: updatedTokens,
    },
    { status: 200 }
  );
}
