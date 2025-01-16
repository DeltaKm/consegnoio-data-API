"use client";

import { testDelivery } from "@prisma/client";
import useSWR from "swr";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DeleteDelivery from "./delete-delivery";
import CreateDelivery from "./create-delivery";


const fetcher = async (url: string) => {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY; 
  if (!apiKey) {
    throw new Error("API Key non configurata. Controlla il file .env");
  }

  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey, 
    },
  }); 

  if (!res.ok) {
    throw new Error(`Errore HTTP: ${res.status}`);
  }

  return res.json();
};

export default function FetchtestDelivery() {
  const {
    data: deliveryData,
    error,
    isLoading,
  } = useSWR<testDelivery[]>("/api/v1/test", fetcher);  

  console.log(deliveryData);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-40 bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>Errore di caricamento</div>;

  const view = deliveryData || [];

  return (
    <>
      <h1 className="text-4x1 font-bold my-4 pl-2">Test API</h1>

      {view.map((e) => (
        <Card className="group relative mx-5 my-8 max-w-[100%]" key={e.id}>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteDelivery id={e.id} />
          </div>
   
          <CardContent>       
          <p className="pt-5"><strong>Nome: </strong>{e.name}</p>
          </CardContent>
  
          <CardContent>
          <p><strong>Indirizzo di ritiro: </strong>{e.pickupAddress}</p>                    
          </CardContent>
 
          <CardContent >
          <p><strong>Indirizzo di consegna </strong>{e.deliveryAddress}</p>            
          </CardContent>

          <CardContent >
          <p><strong>Compenso:</strong> {e.compensation}</p>            
          </CardContent>



          <CardContent >
          <p><strong>Created At: </strong>{e.createdAt.toString()}</p>            
          </CardContent>  

          <CardContent >
          <p><strong>Update At: </strong>{e.updateAt.toString()}</p>            
          </CardContent>       
          
        </Card>
      ))}
      <div className="px-10">
         <CreateDelivery />
       </div>
    </>
  );
}