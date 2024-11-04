"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


import { Todo } from "@prisma/client";
import useSWR from "swr";
import { TypeOf, z } from "zod"
import DeleteList from "./delete-list";


const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function List() {
  const {
     data: todos,
     error, 
     isLoading,
  } = useSWR<Todo[]>("/api/todos", fetcher);

 const User = z.object({
  username: z.string().min(4).max(4),
 });


 //Validazione per TS
 type User = z.infer<typeof User> 
 const Utente = z.string().min(2).max(4)

//Validazione per TS
 type Utente = z.infer<typeof Utente> 
 const t: Utente= "t2";

 User.parse({username: "test"})


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

    const List = todos || [];

  return (
    <div className="space-y-4">
      {List.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">Aggiungi task</p>
          </CardContent>
        </Card>
      ) : (
        List.map((todo) => (
          <Card className="group relative" key={todo.id}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteList id={todo.id} />
            </div>
            <CardHeader>
              <CardTitle>
                <span className={todo.isCompleted ? "line-through" : ""}>
                  {todo.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{todo.description}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
