"use client";

import { Button } from "./ui/button";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "./ui/dialog";
import { 
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "./ui/form";
import { Input } from "./ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { testDeliverySchema, type TestDeliverySchema } from "@/lib/zod";
import { useState } from "react";
import { mutate } from "swr";

export default function CreateUser() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isDialogOpen, setDialogOpen] = useState(false);
   

    const form = useForm<TestDeliverySchema>({
        resolver: zodResolver(testDeliverySchema),
        defaultValues: {
            name: "",
            pickupAddress: "",
            deliveryAddress: "",
            compensation: 0
                        
                       
        },
    });

    const onSubmit = async (data: TestDeliverySchema) => {        
        setIsSubmitting(true);
        setErrorMessage("");

        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
        const headers = {
            "Content-Type": "application/json",
            ...(apiKey && { "x-api-key": apiKey }), 
          };

        try {
            const response = await fetch("/api/v1/test", {
                method: "POST",
                headers,                
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.message || "Errore di caricamento");
            }

            await mutate("/api/v1/test");
            form.reset();
            setDialogOpen(false);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Errore inaspettato";
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>                
                <Button>Aggiungi Consegna</Button>                
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>Iserisci Consegna</DialogTitle>
                    <DialogDescription />
                </DialogHeader>

                {errorMessage && (
                    <div className="text-red-500 text-sm mb-4">
                        {errorMessage}
                    </div>
                )}


                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pickupAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Indirizzo di ritiro</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                                                <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Indirizzo di consegna</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                            <FormField
                            control={form.control}
                            name="compensation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Compenso</FormLabel>
                                    <FormControl>
                                        <Input 
                                        className="resize-none"
                                        {...field} onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                         type="number" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         <div>
                        <Button 
                            disabled={isSubmitting}
                            className="w-full relative"
                            variant='outline'                            
                            type="submit"
                        >
                            {isSubmitting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            Crea ordine
                        </Button></div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
