import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { authenticateToken } from '@/app/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Utente non autorizzato' }, { status: 401 });
  }

  const { userId } = params;

  try {
    const raider = await prisma.raider.findFirst({
      where: { userId },
      select: { id: true, userId: true },
    });

    if (!raider) {
      return NextResponse.json({ message: 'Raider non trovato' }, { status: 404 });
    }

    return NextResponse.json(raider);
  } catch (error: any) {
    console.error('Errore nel recupero del raider:', error);
    return NextResponse.json({ message: 'Errore interno', error: error.message }, { status: 500 });
  }
}
