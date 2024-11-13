"use client";


import { useToast } from "@/hooks/use-toast"
import { Button } from "./ui/button";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
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
import { comuniSchema, type ComuniSchema } from "@/lib/zod";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { useState } from "react";
import { mutate } from "swr";

export default function CreateComuni() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isDialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast()

    const form = useForm<ComuniSchema>({
        resolver: zodResolver(comuniSchema),
        defaultValues: {
            codiceIstat: "",
            denominazioneIta: "",
            cap: "",
            siglaProvincia: "",
            denominazioneProvincia: "",
            denominazioneRegione: "",            
        },
    });

    const onSubmit = async (data: ComuniSchema) => {
        setIsSubmitting(true);
        setErrorMessage(""); // Azzera l'errore all'inizio

        try {
            const response = await fetch("/api/crud", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.message || "Errore di caricamento");
            }

            await mutate("/api/crud");
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
                <Button>Aggiungi Comune</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>Iserisci Comune</DialogTitle>
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
                            name="codiceIstat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Codice ISTAT</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="denominazioneIta"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Denominazione ITA</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                            <FormField
                            control={form.control}
                            name="cap"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CAP</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                           <FormField
                            control={form.control}
                            name="siglaProvincia"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sigla Provincia</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                                                    <FormField
                            control={form.control}
                            name="denominazioneProvincia"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Denominazione Provincia</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                                                    <FormField
                            control={form.control}
                            name="denominazioneRegione"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Denominazione Regione</FormLabel>
                                    <FormControl>
                                        <Input className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
   
                        <Button 
                            disabled={isSubmitting}
                            className="w-full relative"
                            variant="outline"
                            
                            type="submit"
                            onSubmit={() => {
                                
                                toast({
                                  description: "Scheda caricata",
                                  
                                })
                              }}
                        >
                            {isSubmitting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            Crea scheda
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
