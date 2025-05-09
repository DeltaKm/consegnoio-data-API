// app/api/v1/raider/register-token/route.ts
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

  // 1) Trova il raider con quel userId
  const raider = await prisma.raider.findFirst({
    where: { userId },
    select: { id: true }
  });
  if (!raider) {
    return NextResponse.json({ message: 'Raider not found' }, { status: 404 });
  }

  // 2) Aggiorna il documento usando l'id
  const updated = await prisma.raider.update({
    where: { id: raider.id },
    data: {
      deviceTokens: { push: token }
    }
  });

  return NextResponse.json(
    { message: 'Token registered', deviceTokens: updated.deviceTokens },
    { status: 200 }
  );
}
