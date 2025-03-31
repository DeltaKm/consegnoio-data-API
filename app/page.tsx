'use client'
import { Download, Smartphone, Shield, Wifi } from 'lucide-react';
import Logo from '@/public/consegnoio_logo_rosso_senza_scritta.svg';
import Image from 'next/image';
import { useEffect } from 'react';


export default function Home() {

  const handleDownloadClick = () => {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.close();
      }
    }, 5000);
  };
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-10 via-pink-100 to-pink-200">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
               <div className="flex justify-center mb-6">
           <Image src={Logo} alt="Consegno.io Logo" width={80} height={80} />
           </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Consegnoio
            </h1>
            {/* <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Organizza le tue consegne, ricevi aggiornamenti in tempo reale e accedi a tutte le funzionalità per ottimizzare il tuo lavoro da rider, tutto in un'unica app intuitiva e veloce.
            </p> */}
          </div>

          {/* <div className="grid md:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={<Smartphone className="w-8 h-8 text-[#d5184e]" />}
              title="Gestione Ordini"
              description="Controlla e gestisci facilmente tutte le tue consegne attive e completate"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-[#d5184e]" />}
              title="Sistema Sicuro"
              description="Tutti i dati delle tue consegne sono protetti e sempre accessibili"
            />
            <FeatureCard
              icon={<Wifi className="w-8 h-8 text-[#d5184e]" />}
              title="Aggiornamenti"
              description="Ricevi notifiche live su nuovi ordini, percorsi e modifiche"
            />
          </div> */}

          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
            <div className="max-w-md mx-auto">
              {/* <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Inizia le tue consegne ora
              </h2> */}
              <p className="text-gray-600 mb-8">
                Scarica l'app e unisciti alla rete dei raider: organizza, consegna e monitora ogni ordine con semplicità.
              </p>
              <a
                href="/downloads/consegnoio.apk"
                download
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-3 bg-[#d5184e] hover:bg-[#b51440] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Download className="w-6 h-6" />
                Scarica APK
              </a>
              <p className="mt-6 text-sm text-gray-500">
                Versione 1.0.0 - Build:3 • Compatibile con Android 7.0 e superiori
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600">
        {description}
      </p>
    </div>
  );
}

