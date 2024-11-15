import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key'); 

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      { error: "Non autorizzato: API Key non valida" },
      { status: 401 }
    );
  }

  return NextResponse.next();}

export const config = {
  matcher: '/api/:path*', 
};