import { listSchema } from "@/lib/zod";
import prisma from "../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";



export async function GET() {

    try{
        const todos = await prisma.todo.findMany({

            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(todos);

    } catch (error) {

        console.log("errore in fase di fetching", error);

        return NextResponse.json({message: "errore in fase di fetching"}, {status:500});
    }
}

export async function POST(request: NextRequest) {
    try {

        const body = await request.json();
        const result = listSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({message: "inpunt non valido", errors: result.error.errors}, {status: 400});
        }

        const listData = result.data;

        const newList= await prisma.todo.create({
            data: {
                title: listData.title,
                description: listData.description || "",
                isCompleted: listData.isCompleted
            },
        });

        return NextResponse.json(newList, {status: 201});
        
    } catch (error) {
        console.error("Errore aggiunta lista", error);
        return NextResponse.json({message: "Errore inatteso"}, {status: 500});
    }    
}

export async function DELETE(request: NextRequest) {
    try {

        const id = request.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({message: "id richiesto"}, {status: 400});
        }

  

        const deleteList= await prisma.todo.delete({
          where: { id },
        });

        if(!deleteList) {
            return NextResponse.json({ message: "Lista non trovata"}, {status: 400});
        }
        
    } catch (error) {
        console.error("Errore eliminazione lista", error);
        return NextResponse.json({message: "Errore inatteso"}, {status: 500});
    }    
}

