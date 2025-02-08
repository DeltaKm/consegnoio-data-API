// import { NextRequest, NextResponse } from 'next/server';

// // **** INIZIO CORS POLICY => da implementare
// const allowedOrigins = ['https://acme.com', 'https://my-app.org']
 
// const corsOptions = {
//   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
// }
// // *** FINE CORS POLICY

// export function middleware(req: NextRequest) {

//   if(req.method === 'OPTIONS'){
//     return NextResponse.json({status: 200})
//   }
  
//   const apiKeyHeader = req.headers.get('x-api-key'); 
//   const apiKeyQuery = req.nextUrl.searchParams.get('apiKey'); 

//   const apiKey = apiKeyHeader || apiKeyQuery; 

//   if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
//     return NextResponse.json(
//       { error: "Non autorizzato: API Key non valida" },
//       { status: 401 }
      
//     );
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: '/api/:path*',
// };


import { NextRequest, NextResponse } from 'next/server';

// accettare tutte le origini prima di pushare
const allowedOrigins = [ 
  'http://localhost:3000',
  'consegnoio-data-api.vercel.app'
];

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400', 
};

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    const response = NextResponse.json(
      { status: 200 },
      { headers: corsHeaders }
    );
    return response;
  }

  const apiKeyHeader = req.headers.get('x-api-key');
  const apiKeyQuery = req.nextUrl.searchParams.get('apiKey');
  const apiKey = apiKeyHeader || apiKeyQuery;

  if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
    const errorResponse = NextResponse.json(
      { error: "Non autorizzato: API Key non valida o mancante" },
      { 
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    return errorResponse;
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  if (origin && !allowedOrigins.includes(origin)) {
    const errorResponse = NextResponse.json(
      { error: "Origine non consentita" },
      { 
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    return errorResponse;
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};