"use client";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { testDeliverySchema, type TestDeliverySchema } from "@/lib/zod";
import { useState } from "react";
import { mutate } from "swr";

export default function CreateDelivery() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);

  const form = useForm<TestDeliverySchema>({
    resolver: zodResolver(testDeliverySchema),
    defaultValues: {
      name: "",
      pickupAddress: "",
      deliveryAddress: "",
      totalDistance: "",
      deliveryType: "",
      peso: 0,
      numeroColli: 0,
      compensation: 0,
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
      const message =
        error instanceof Error ? error.message : "Errore inaspettato";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full max-w-sm mx-auto mt-4">
          Aggiungi Consegna
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white p-4 sm:p-6 mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold">
            Inserisci Consegna
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-gray-600">
            Compila i dettagli della consegna
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {errorMessage}
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex flex-col items-center"
          >
            <div className="grid gap-4 sm:grid-cols-2 w-full">
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
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distanza totale</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipologia merce</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="peso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numeroColli"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero colli</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4 w-full">
              <Button
                disabled={isSubmitting}
                className="w-full relative"
                variant="outline"
                type="submit"
              >
                {isSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                Crea ordine
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
