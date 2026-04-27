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
  const normalizedToken = typeof token === 'string' ? token.trim() : '';
  if (!normalizedToken) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const raider = await prisma.raider.findFirst({
    where: { userId },
    select: { id: true, deviceTokens: true },
  });
  if (!raider) {
    return NextResponse.json({ message: 'Raider not found' }, { status: 404 });
  }

  const raidersWithSameToken = await prisma.raider.findMany({
    where: {
      id: { not: raider.id },
      deviceTokens: { has: normalizedToken },
    },
    select: { id: true, deviceTokens: true },
  });

  for (const otherRaider of raidersWithSameToken) {
    const cleanedTokens = (otherRaider.deviceTokens || []).filter(
      (storedToken) => storedToken !== normalizedToken
    );

    await prisma.raider.update({
      where: { id: otherRaider.id },
      data: {
        deviceTokens: { set: cleanedTokens },
      },
    });
  }

  const currentTokens = Array.from(new Set(raider.deviceTokens || []));
  const alreadyRegistered = currentTokens.includes(normalizedToken);
  const updatedTokens = alreadyRegistered
    ? currentTokens
    : [...currentTokens, normalizedToken];

  if (!alreadyRegistered || currentTokens.length !== (raider.deviceTokens || []).length) {
    await prisma.raider.update({
      where: { id: raider.id },
      data: {
        deviceTokens: { set: updatedTokens },
      },
    });
  }

  return NextResponse.json(
    {
      message:
        raidersWithSameToken.length > 0
          ? 'Token moved to current raider'
          : alreadyRegistered
          ? 'Token already registered'
          : 'Token registered',
      deviceTokens: updatedTokens,
      removedFromOtherRaiders: raidersWithSameToken.length,
    },
    { status: 200 }
  );
}
