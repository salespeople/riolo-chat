
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';


interface ApiDocumentationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const apiEndpoints = [
  {
    title: 'Creare una Prescrizione',
    method: 'POST',
    endpoint: '/api/prescriptions',
    when: "Viene chiamata da un sistema esterno (es. gestionale) per registrare una nuova prescrizione medica nel database. Richiede autenticazione tramite API Key.",
    payload: `{\n  "patientName": "Mario Rossi",\n  "fiscalCode": "RSSMRA...",\n  "prescriptionCode": "03123...",\n  "regionCode": "190",\n  "priority": "D",\n  "exemptionCode": "048",\n  "diagnosticQuestion": "Controllo",\n  "prescribedExam0": "ESAME 1",\n  "prescribedExam1": "ESAME 2",\n  "prescribedExam2": null,\n  "prescribedExam3": null,\n  "prescribedExam4": null,\n  "appropriateness": "P",\n  "contactID": "12345",\n  "timestamp": "${new Date().toISOString()}",\n  "typeMessage": "Ricetta",\n  "url": "http://example.com/ricetta.pdf"\n}`,
    headers: `{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer YOUR_API_KEY"\n}`,
    response: `{\n  "success": true,\n  "message": "Prescription created successfully.",\n  "id": "doc_id_..."\n}`,
    usage: "Questo endpoint riceve i dati della prescrizione in formato JSON e richiede una chiave API nell'header 'Authorization' come Bearer Token. I dati vengono sanificati e salvati in Firestore.",
    isTestable: true,
  },
  {
    title: 'Webhook da SendPulse',
    method: 'POST',
    endpoint: '/api/sendpulse-webhook',
    when: "Viene chiamato da SendPulse ogni volta che si verifica un evento rilevante per uno dei bot configurati (es. nuovo messaggio in arrivo, messaggio inviato, etc.).",
    payload: "Il payload è un array di eventi in formato JSON. La struttura varia in base al tipo di evento (es. 'incoming_message', 'outgoing_message'). Vedi la documentazione di SendPulse per i dettagli.",
    response: `{\n  "success": true\n}`,
    usage: "Questo endpoint riceve le notifiche da SendPulse. Non modifica direttamente la UI, ma scrive un 'segnale' in una collezione Firestore (`realtime_updates`). Un listener nell'applicazione rileva questo segnale e aggiorna la chat corrispondente in tempo reale, garantendo la sincronizzazione istantanea. Per attivarlo, inserisci l'URL completo di questo endpoint nelle impostazioni del tuo bot su SendPulse.",
  },
  {
    title: 'Ottenere Access Token',
    method: 'POST',
    endpoint: '/oauth/access_token',
    when: "Viene chiamata automaticamente prima di qualsiasi altra richiesta a SendPulse se il token non è presente in memoria o se è scaduto. La validità è di 1 ora (3600 secondi).",
    payload: `{\n  "grant_type": "client_credentials",\n  "client_id": "YOUR_CLIENT_ID",\n  "client_secret": "YOUR_CLIENT_SECRET"\n}`,
    response: `{\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "access_token": "eyJ...w"\n}`,
    usage: "L'access_token restituito viene memorizzato in una variabile globale insieme alla sua data di scadenza. Tutte le successive chiamate API includeranno questo token nell'header 'Authorization: Bearer {access_token}'.",
  },
  {
    title: 'Recuperare le Chat',
    method: 'GET',
    endpoint: '/whatsapp/chats?bot_id={BOT_ID}',
    when: "Al caricamento iniziale dell'applicazione e ad ogni aggiornamento (sia manuale tramite il pulsante 'Refresh', sia automatico ogni 15 secondi) per sincronizzare la lista delle chat.",
    payload: "Nessun payload. Il BOT_ID viene letto dalle variabili d'ambiente e inserito nell'URL.",
    response: `{\n  "success": true,\n  "data": [\n    {\n      "inbox_last_message": { ... },\n      "inbox_unread": 2,\n      "contact": { ... dettagli contatto ... }\n    },\n    ...\n  ]\n}`,
    usage: "L'array 'data' viene mappato per creare la lista di chat. Per ogni oggetto, si estrapolano: `contact` per i dati dell'utente, `inbox_last_message` per generare lo snippet dell'ultimo messaggio, e `inbox_unread` per il contatore dei non letti. Questi dati popolano lo stato `allChats`.",
  },
  {
    title: 'Recuperare i Messaggi di una Chat',
    method: 'GET',
    endpoint: '/whatsapp/chats/messages?contact_id={CONTACT_ID}',
    when: "Quando un utente seleziona una chat dalla lista per la prima volta o se i messaggi per quella chat non sono ancora stati caricati.",
    payload: "Nessun payload. Il `contact_id` viene preso dalla chat selezionata.",
    response: `{\n  "success": true,\n  "data": [\n    {\n      "id": "msg1",\n      "type": "text",\n      "direction": 1, // 1 = in entrata, 2 = in uscita\n      "data": { "text": { "body": "Ciao" } },\n      "created_at": "..."\n    }\n  ]\n}`,
    usage: "L'array 'data' viene mappato per popolare la conversazione. La proprietà `direction` è fondamentale per distinguere tra messaggi del contatto (1) e messaggi dell'agente (2), applicando stili diversi. Il `type` del messaggio determina come renderizzare il contenuto (testo, immagine, etc.).",
  },
  {
    title: 'Inviare un Messaggio',
    method: 'POST',
    endpoint: '/whatsapp/contacts/send',
    when: "Quando l'operatore invia un messaggio di testo, un'immagine o un documento dalla barra di input della chat.",
    payload: `// Per un testo\n{\n  "contact_id": "...",\n  "message": { "type": "text", "text": { "body": "..." } }\n}\n\n// Per un'immagine con didascalia\n{\n  "contact_id": "...",\n  "message": { "type": "image", "image": { "link": "https://...url.jpg", "caption": "Didascalia" } }\n}`,
    response: `{\n  "success": true,\n  "data": { "message_id": "wamid.ID" }\n}`,
    usage: "La UI viene aggiornata 'ottimisticamente': il messaggio appare subito con un ID temporaneo. Dopo la risposta positiva, l'ID temporaneo del messaggio viene sostituito con il `message_id` reale restituito dall'API, garantendo la coerenza.",
  },
  {
    title: 'Aggiungere un Contatto',
    method: 'POST',
    endpoint: '/whatsapp/contacts',
    when: "Quando un operatore compila e salva i dati dal dialogo 'Aggiungi nuovo contatto'.",
    payload: `{\n  "bot_id": "...",\n  "name": "Mario Rossi",\n  "phone": "+393331234567"\n}`,
    response: `{\n  "success": true,\n  "data": { "contact_id": "contact_..." }\n}`,
    usage: "La risposta di successo conferma la creazione. Successivamente, viene forzato un aggiornamento della lista chat (`getChats`) per includere il nuovo contatto.",
  },
  {
    title: 'Creare una Nota',
    method: 'POST',
    endpoint: '/whatsapp/contacts/createNote',
    when: "Quando un operatore scrive e invia una nota dalla scheda 'Nota'.",
    payload: `{\n  "contact_id": "...",\n  "bot_id": "...",\n  "text": "Nuova nota per il cliente."\n}`,
    response: `{\n  "success": true,\n  "data": { ...oggetto nota completo... }\n}`,
    usage: "A differenza dell'invio messaggi, qui si attende la risposta positiva dell'API. L'oggetto `data` restituito, che contiene la nota completa con il suo ID e timestamp, viene usato per aggiungere la nota allo stato della chat, garantendo che sia visualizzata solo se salvata correttamente.",
  },
    {
    title: 'Modificare/Eliminare Note',
    method: 'POST',
    endpoint: '/whatsapp/contacts/(updateNote|deleteNote)',
    when: "Quando un operatore modifica o elimina una nota esistente dalla scheda 'Nota'.",
    payload: `// Modifica\n{\n  "contact_id": "...",\n  "bot_id": "...",\n  "note_id": "...",\n  "text": "Testo aggiornato"\n}\n\n// Eliminazione\n{\n  "contact_id": "...",\n  "bot_id": "...",\n  "note_id": "..."\n}`,
    response: `// Modifica\n{\n  "success": true,\n  "data": { ...oggetto nota aggiornato... }\n}\n\n// Eliminazione\n{\n  "success": true\n}`,
    usage: "L'operazione viene eseguita 'ottimisticamente' sulla UI (la nota viene modificata o rimossa subito). Se l'API restituisce un errore, la modifica viene annullata, ripristinando lo stato precedente per garantire coerenza.",
  },
  {
    title: 'Gestione Tag (Aggiungi/Rimuovi)',
    method: 'POST',
    endpoint: '/whatsapp/contacts/(setTag|deleteTag)',
    when: "Quando un operatore aggiunge un nuovo tag o rimuove un tag esistente dalla sezione 'Tags' nella sidebar.",
    payload: `// Aggiunta\n{\n  "contact_id": "...",\n  "tags": ["Nuovo Tag"]\n}\n\n// Rimozione\n{\n  "contact_id": "...",\n  "tag": "Tag da rimuovere"\n}`,
    response: `{\n  "success": true\n}`,
    usage: "La risposta di successo conferma l'operazione. Lo stato della chat (`chat.details.tags`) viene aggiornato per riflettere immediatamente l'aggiunta o la rimozione, mantenendo la UI sincronizzata.",
  },
  {
    title: 'Gestione Variabili (Imposta/Elimina)',
    method: 'POST',
    endpoint: '/whatsapp/contacts/(setVariable|deleteVariable)',
    when: "Quando un operatore modifica e salva le variabili nella sezione 'Variabili' della sidebar.",
    payload: `// Impostazione\n{\n  "contact_id": "...",\n  "variables": [{ "variable_name": "email", "variable_value": "test@test.com" }]\n}\n\n// Eliminazione\n{\n  "contact_id": "...",\n  "variable_name": "email"\n}`,
    response: `{\n  "success": true\n}`,
    usage: "La chiamata viene effettuata al salvataggio. Una risposta positiva conferma le modifiche, che sono già state applicate localmente nello stato del componente. In caso di errore, l'utente viene notificato.",
  },
   {
    title: 'Pausa/Ripresa Automazioni',
    method: 'POST',
    endpoint: '/whatsapp/contacts/(setPauseAutomation|deletePauseAutomation)',
    when: "Quando un operatore mette in pausa o riprende le automazioni dalla sezione 'Pausa Automazione' nella sidebar.",
    payload: `// Pausa\n{\n  "contact_id": "...",\n  "minutes": 60\n}\n\n// Ripresa\n{\n  "contact_id": "..."\n}`,
    response: `// Pausa\n{\n  "success": true,\n  "data": "2025-10-22T12:00:00+00:00"\n}\n\n// Ripresa\n{\n  "success": true\n}`,
    usage: "Per la pausa, la data di scadenza (`data`) restituita dall'API viene salvata nello stato della chat e usata per visualizzare il conto alla rovescia. Per la ripresa, la risposta di successo resetta lo stato di pausa nella UI.",
  },
  {
    title: 'Assegnazione Operatore',
    method: 'POST',
    endpoint: '/whatsapp/contacts/operators/(assign|unAssign)',
    when: "Quando si assegna o si rimuove un operatore da una chat tramite il menu a tendina nell'header della chat.",
    payload: `// Assegnazione\n{\n  "contact_id": "...",\n  "operator_id": 12345\n}\n\n// Rimozione (unAssign)\n{\n  "contact_id": "..."\n}`,
    response: `{\n  "success": true\n}`,
    usage: "Dopo una risposta di successo, lo stato della chat viene aggiornato per riflettere il nuovo operatore assegnato (o la sua rimozione). Questo aggiorna sia l'avatar nell'header della chat sia le informazioni nella sidebar 'Informazioni Contatto'.",
  },
];

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
        <h4 className="font-semibold text-sm text-foreground/90">{title}</h4>
        {children}
    </div>
);

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
    <pre className="text-xs font-mono bg-muted p-2 rounded-md whitespace-pre-wrap">{children}</pre>
);


export default function ApiDocumentationDialog({ isOpen, onClose }: ApiDocumentationDialogProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documentazione API</DialogTitle>
          <DialogDescription>
            Dettagli sulle chiamate API utilizzate per l'integrazione con servizi esterni.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-6">
            <Accordion type="single" collapsible className="w-full">
              {apiEndpoints.map((api, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4 w-full">
                      <Badge 
                        className={api.method.includes('GET') ? 'bg-sky-600/80 hover:bg-sky-600' : 'bg-emerald-600/80 hover:bg-emerald-600'}
                      >
                        {api.method}
                      </Badge>
                      <span className="font-mono text-sm text-left flex-1">{api.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pl-4 pt-2">
                    <Section title="Endpoint">
                        <CodeBlock>{api.endpoint}</CodeBlock>
                    </Section>
                    
                    <Section title="Quando viene chiamata">
                        <p className="text-sm text-muted-foreground">{api.when}</p>
                    </Section>

                    <Separator />
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        {api.headers && (
                           <Section title="Headers Richiesti">
                             <CodeBlock>{api.headers}</CodeBlock>
                           </Section>
                        )}
                        <Section title="Esempio di Payload">
                            <CodeBlock>{api.payload}</CodeBlock>
                        </Section>
                        <Section title="Esempio di Risposta">
                            <CodeBlock>{api.response}</CodeBlock>
                        </Section>
                    </div>

                     <Separator />

                    <Section title="Utilizzo dei Dati">
                         <p className="text-sm text-muted-foreground">{api.usage}</p>
                    </Section>

                    {api.isTestable && (
                        <>
                            <Separator />
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Test dell'Endpoint</AlertTitle>
                                <AlertDescription>
                                  <p>
                                    Per testare questo endpoint, utilizza lo script da riga di comando fornito. Assicurati di aver configurato la variabile <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">PRESCRIPTIONS_API_KEY</code> nel tuo file <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env</code>.
                                  </p>
                                  <pre className="mt-2 text-xs font-mono bg-muted p-2 rounded-md whitespace-pre-wrap">npm run test:api</pre>
                                </AlertDescription>
                            </Alert>
                        </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
