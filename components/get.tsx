"use client"

import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

type ToastProps = {
    lat: Number
    long: Number
}

export const ToastDemo = ({lat, long}: ToastProps) => {

    const { toast } = useToast() 
     
    return (
      <Button
        onClick={() => {
          toast({
            title: "Coordinate impostate",
            description: `Lat: ${lat} Long: ${long}`
          })
        }}
      >
        Mostra Coordinate
      </Button>
    )
  }
  

  
