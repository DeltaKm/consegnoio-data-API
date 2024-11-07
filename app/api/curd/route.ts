import prisma from "../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";



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
