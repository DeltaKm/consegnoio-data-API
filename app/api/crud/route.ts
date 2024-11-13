import prisma from "../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";
import { comuniSchema } from "@/lib/zod";


enum StatusCodes {
    NotFound = 404,
    Success = 200,
    Created = 201,
    Accepted = 202,
    BadRequest = 400,
    Unauthorized = 401,
    InternalServerError = 500,
  }
  type responeData = {
    message: string
  }

export async function GET() {

    try{
        const comuniData = await prisma.comuni.findMany({

            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(comuniData);

    } catch (error) {

        console.log("errore in fase di fetching", error);

        return NextResponse.json({message: "errore in fase di fetching"}, {status: StatusCodes.InternalServerError});
    }
}


export async function POST(request: NextRequest) {
    try {

        const body = await request.json();
        const result = comuniSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({message: "inpunt non valido", errors: result.error.errors}, {status: StatusCodes.BadRequest});
        }

        const data = result.data;

        const newList= await prisma.comuni.create({
            data: {
                codiceIstat: data.codiceIstat,
                denominazioneIta: data.denominazioneIta,
                cap: data.cap,
                siglaProvincia: data.siglaProvincia,
                denominazioneProvincia: data.denominazioneProvincia,
                denominazioneRegione: data.denominazioneProvincia,
            },
        });

        return NextResponse.json(newList, {status: StatusCodes.Created});
        
    } catch (error) {
        console.error("Errore caricamento dati", error);
        return NextResponse.json({message: "Errore inatteso"}, {status: StatusCodes.InternalServerError});
    }    
}


export async function DELETE(request: NextRequest) {
    try {

        const id = request.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({message: "id richiesto"}, {status: StatusCodes.BadRequest});
        }
  

        const deleteList= await prisma.comuni.delete({
          where: { id },
        });

        if(!deleteList) {
            return NextResponse.json({ message: "Lista non trovata"}, {status: StatusCodes.BadRequest});
        }
        
    } catch (error) {
        console.error("Errore eliminazione lista", error);
        return NextResponse.json({message: "Errore inatteso"}, {status: StatusCodes.InternalServerError});
    }    
}
// Patch => DataUpdate
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
	try {
		const id = params.id;

		const updated = await prisma.comuni.update({
			where: { id },
			data: {
				denominazioneIta: 'Caserta',
				denominazioneRegione: 'Campania',
				cap: '00000',
			},
		});

		return NextResponse.json(updated);
	} catch (error) {
		console.log('error');
	}
}

