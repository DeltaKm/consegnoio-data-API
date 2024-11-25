"use client"

import { Button } from "./ui/button"
import { TrashIcon } from "@radix-ui/react-icons"
import { mutate } from "swr"

export default function DeleteComuni({ id } : { id : string }) {

    const handleDelete = async () => {
        const response = await fetch(`/api/v1/crud?id=${id}`, {
            method: "DELETE",
        });

        if(response.ok) {
            console.log("Collezione eliminata");
            mutate("/api/v1/crud");
        } else {
            console.error("Errore eliminazione lista")
        }        
    };
    return(         
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <form onSubmit={handleDelete}> {/** da seguire check */}
        <Button
        variant="ghost"
        size="icon"
        type="submit"
        className="text-red-500 bg-red-100 hover:text-red-700 hover:bg-red"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
        </form>
        </div>
        
    )
  
}