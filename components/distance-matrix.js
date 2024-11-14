"use client"

import {Client} from "@googlemaps/google-maps-services-js";
import { DistanceMatrixService } from "@react-google-maps/api";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY



export default async function DistanceMatrix(){

    const client = await new Client({});

client
  .elevation({
    params: {
      locations: [{ lat: 45, lng: -110 }],
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    },
    timeout: 1000, // milliseconds
  })
  .then((r) => {
    console.log(r.data.results[0].elevation);
  })
  .catch((e) => {
    console.log(e.response.data.error_message);
  });

}


