"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


import { Comuni } from "@prisma/client";
import useSWR from "swr";
import { TypeOf, z } from "zod"
import DeleteList from "./delete-list";


const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function List() {
  const {
     data: comuniData,
     error, 
     isLoading,
  } = useSWR<Comuni[]>("/api/curd", fetcher);




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

    const List = comuniData || [];

  return (
    <div className="space-y-4">
      {List.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">Aggiungi comuni</p>
          </CardContent>
        </Card>
      ) : (
        List.map((comuni) => (
          <Card className="group relative" key={comuni.id}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteList id={comuni.id} />
            </div>
            <CardHeader>
              <CardTitle>
                <span className={comuni.coordinate ? "line-through" : ""}>
                  {comuni.denominazioneIta}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{comuni.cap}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
