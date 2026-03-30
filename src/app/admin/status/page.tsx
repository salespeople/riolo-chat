'use server';

import { getDb } from '@/lib/firebase-admin';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default async function AdminStatusPage() {
  let status: 'ok' | 'error' = 'ok';
  let errorMessage: string | null = null;

  try {
    // This will trigger the initialization logic in getDb()
    getDb();
  } catch (e: any) {
    status = 'error';
    errorMessage = e.message;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-3xl rounded-lg border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="mb-4 text-center text-3xl font-bold">Diagnostica del Server</h1>
        <p className="mb-6 text-center text-muted-foreground">
          Questa pagina verifica se il tuo ambiente di produzione (server) ha i permessi necessari per comunicare con Firebase.
        </p>
        
        {status === 'ok' ? (
          <div className="flex items-start gap-4 rounded-md border p-4 border-green-200 bg-green-50 text-green-900">
            <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-green-500" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Stato: TUTTO OK</h2>
              <p className="mt-1 text-sm">
                Il server è configurato correttamente e può comunicare con Firebase. I webhook dovrebbero essere processati. Se riscontri ancora problemi, la causa potrebbe essere altrove.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-md border p-4 border-red-300 bg-red-50 text-red-900">
              <XCircle className="mt-1 h-6 w-6 shrink-0 text-red-500" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Stato: ERRORE DI CONFIGURAZIONE CRITICO</h2>
                <p className="mt-1 text-sm">
                  Il server non è riuscito a connettersi a Firebase. **Questo è il motivo per cui i webhook non vengono registrati.**
                </p>
                 <div className="mt-4 rounded-md bg-red-100 p-3">
                  <p className="font-semibold text-red-950">Messaggio di errore esatto:</p>
                  <p className="font-mono text-xs mt-1 text-red-950">{errorMessage}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                  <h3 className="text-xl font-bold text-amber-900">Azione Richiesta: Come Risolvere</h3>
                </div>
              
               <p className="mb-4 text-amber-800">
                  Per funzionare, il server ha bisogno di una "chiave" di autorizzazione (un file JSON) che gli dia il permesso di accedere al tuo progetto Firebase. Questa chiave è mancante. Segui questi passaggi per generarla e installarla:
               </p>
               <ol className="list-decimal space-y-3 pl-6 text-sm text-amber-900">
                 <li>
                    <strong>Vai alla Console Firebase:</strong> Apri le impostazioni del tuo progetto <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">console.firebase.google.com</a>, clicca sull'icona a forma di ingranaggio e seleziona "Impostazioni progetto".
                 </li>
                 <li>
                    <strong>Trova le Chiavi di Servizio:</strong> Vai alla scheda "Account di servizio".
                 </li>
                  <li>
                    <strong>Genera una nuova chiave:</strong> Clicca sul pulsante "Genera nuova chiave privata". Verrà scaricato un file JSON. **Trattalo come una password, è segreto!**
                 </li>
                 <li>
                    <strong>Aggiungi il Secret in Firebase Hosting:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Sempre nella console di Firebase, vai nella sezione "Hosting".</li>
                        <li>Trova il tuo backend ("nextjs-server") e clicca su "Gestisci".</li>
                        <li>Nella scheda "Secret", clicca su "Aggiungi secret" e inserisci `SERVICE_ACCOUNT_KEY` come nome.</li>
                        <li>Copia e incolla **tutto il contenuto** del file JSON che hai scaricato nel campo del valore.</li>
                         <li>Clicca su "Crea secret" e poi **fai un nuovo deploy** dell'applicazione per applicare le modifiche.</li>
                    </ul>
                 </li>
               </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}