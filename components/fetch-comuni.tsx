"use client";

import { Comuni } from "@prisma/client";
import useSWR from "swr";


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DeleteComuni from "./delete-comuni";
import CreateComuni from "./create-comuni";
import DistanceMatrix from "./distance-matrix";



const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FetchComuni() {
  const {
     data: comuniData,
     error, 
     isLoading,
  } = useSWR<Comuni[]>("/api/crud", fetcher);

  console.log(comuniData)
  



  if(isLoading)

    return(
        <div className="flex justify-center items-center h-40 bg-white">
            <div className="relative w-12 h-12">
                <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
                <div className="absolute w-12 h-12 border-4 border-primary roundend-full animate-ping opacity-25"></div>
            </div>
        </div>
    );

    if(error) return <div>Errore di caricamento</div>;

    const view = comuniData || []
   

  return (
    
<>
   
      <h1 className="text-4x1 font-bold my-4 pl-2">Test REST API GET</h1>

   { view.map((e) =>  (
   
            <Card className="group relative mx-5 my-8 max-w-[70%]" key={e.id}>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteComuni id={e.id} />
            </div>
           
                <CardHeader>
                <CardTitle>
                    {e.denominazioneIta}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{e.siglaProvincia}</p>
              </CardContent>
              </Card>
            ) )}
            <div className="pl-5">
            <CreateComuni />
            </div>
            
  </>
  

  );
}
