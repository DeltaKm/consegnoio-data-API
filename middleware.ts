import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  
  if(req.method === 'OPTIONS'){
    return NextResponse.json({status : 200})
  }
  const apiKeyHeader = req.headers.get('x-api-key'); 
  const apiKeyQuery = req.nextUrl.searchParams.get('apiKey'); 

  const apiKey = apiKeyHeader || apiKeyQuery; 

  if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
    return NextResponse.json(
      { error: "Non autorizzato: API Key non valida" },
      { status: 401 }
      
    );
  }

  return NextResponse.next();
}


export const config = {
  matcher: '/api/:path*',
};
