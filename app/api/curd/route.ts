import prisma from "../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";
import { comuniSchema } from "@/lib/zod";



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

        return NextResponse.json({message: "errore in fase di fetching"}, {status:500});
    }
}


export async function POST(request: NextRequest) {
    try {

        const body = await request.json();
        const result = comuniSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({message: "inpunt non valido", errors: result.error.errors}, {status: 400});
        }

        const listData = result.data;

        const newList= await prisma.comuni.create({
            data: {
                codiceIstat: listData.codiceIstat,
                denominazioneIta: listData.denominazioneIta,
                cap: listData.cap,
                siglaProvincia: listData.siglaProvincia,
                denominazioneProvincia: listData.denominazioneProvincia,
                denominazioneRegione: listData.denominazioneProvincia,
            },
        });

        return NextResponse.json(newList, {status: 201});
        
    } catch (error) {
        console.error("Errore aggiunta lista", error);
        return NextResponse.json({message: "Errore inatteso"}, {status: 500});
    }    
}
