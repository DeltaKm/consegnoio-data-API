
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}


export async function POST(request: NextRequest) {
  let savedData = null;
  let statusCode = StatusCodes.Created;
  let errorMessage: string | null = null;
  
  try {
    const body = await request.json();
    
    const searchParams = request.nextUrl.searchParams;
    const restaurant_code = searchParams.get('restaurant_code');
    const subscriber_code = searchParams.get('subscriber_code');


    let content: any;
    if (typeof body === 'object' && body !== null) {
      content = { ...body };
    } else {
      content = { data: body };
    }
    
    if (restaurant_code !== null) {
      content.restaurant_code = restaurant_code;
    }
    if (subscriber_code !== null) {
      content.subscriber_code = subscriber_code
    }
 
    const rif_app = searchParams.get('rif_app')
    if (rif_app !== null) { content.rif_app = rif_app }

    
    const user_id = searchParams.get('user_id')
    if (user_id !== null) { content.user_id = user_id }

    
    const token_jwt = searchParams.get('token_jwt')
    if (token_jwt !== null) { content.token_jwt = token_jwt}
    
    
    savedData = await prisma.data.create({
      data: { content },
    });
  } catch (error) {
    console.error("Errore durante la creazione dei dati:", error);
    statusCode = StatusCodes.InternalServerError;
    errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
  }
  
  if (statusCode === StatusCodes.Created) {
    return NextResponse.json(
      { status: "success", savedData },
      { status: StatusCodes.Created }
    );
  } else {
    return NextResponse.json(
      { message: "Errore durante la creazione dei dati", error: errorMessage },
      { status: statusCode }
    );
  }
}

