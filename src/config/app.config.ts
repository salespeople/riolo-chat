// ============================================================================
// APP CONFIGURATION
// ============================================================================
// Questo file centralizza tutte le impostazioni dell'applicazione.
// Modifica i valori qui sotto per personalizzare l'interfaccia e connettere
// i bot senza dover toccare il database.
// ============================================================================

// --- TEMA (globale, uguale per tutte le istanze) ----------------------------

export const themeConfig = {
  /** Colore primario (header, pulsanti principali) */
  primaryColor: "#007bc3",

  /** Colore accento (badge, evidenziazioni, elementi secondari) */
  accentColor: "#a4d4f5",

  /** URL del logo nell'header (lascia vuoto per usare l'emoji) */
  logoUrl: "",

  /** Emoji mostrata nell'header al posto del logo (usata se logoUrl è vuoto) */
  logoEmoji: "💬",
} as const;

// --- ISTANZE ----------------------------------------------------------------
// Ogni istanza rappresenta un ambulatorio/sede con il proprio bot WhatsApp.
// L'app mostra tutte le istanze elencate qui nella stessa interfaccia.
//
// Per trovare i valori del bot:
// - botId: SendPulse → Chatbot → il tuo bot → URL contiene l'ID
// - clientId / clientSecret: SendPulse → Account Settings → API
// - phone: il numero WhatsApp associato al bot
// -------------------------------------------------------------------------

export interface AppInstance {
  /** ID univoco dell'istanza (usato per filtrare utenti, prescrizioni, quick replies) */
  instanceId: string;

  /** Nome mostrato nell'header quando questa istanza è attiva */
  headerName: string;

  /** Configurazione del bot WhatsApp collegato a questa istanza */
  bot: {
    botId: string;
    clientId: string;
    clientSecret: string;
    phone: string;
  };
}

export const instances: AppInstance[] = [
  {
    instanceId: "riolo",
    headerName: "riolo Chat Manager",
    bot: {
      botId: "68cbe42e71907d2316035ccc",
      clientId: "165515ea898ccf3b6bb4a582f9fe7c60",
      clientSecret: "9365de4cef4a6924ab05cdc8dfeee323",
      phone: "0918488398",
    },
  },
  // Per aggiungere una seconda istanza, decommenta e compila:
  // {
  //   instanceId: "altra-sede",
  //   headerName: "Altra Sede Chat Manager",
  //   bot: {
  //     botId: "SECONDO_BOT_ID",
  //     clientId: "SECONDO_CLIENT_ID",
  //     clientSecret: "SECONDO_CLIENT_SECRET",
  //     phone: "+39XXXXXXXXXX",
  //   },
  // },
];

// --- HELPER -----------------------------------------------------------------
// Funzioni per accedere alle istanze e ai bot senza leggere dal database.

const instancesByIdMap = new Map(instances.map((i) => [i.instanceId, i]));
const instancesByBotIdMap = new Map(instances.map((i) => [i.bot.botId, i]));

/** Trova un'istanza per il suo instanceId */
export function getInstanceById(instanceId: string): AppInstance | null {
  return instancesByIdMap.get(instanceId) ?? null;
}

/** Trova un'istanza a partire dal botId SendPulse */
export function getInstanceByBotId(botId: string): AppInstance | null {
  return instancesByBotIdMap.get(botId) ?? null;
}

/** Restituisce tutte le istanze configurate */
export function getAllInstances(): AppInstance[] {
  return instances;
}

/** Restituisce tutti i bot in formato flat (per compatibilità con il codice esistente) */
export function getAllBots() {
  return instances.map((i) => ({
    id: i.bot.botId,
    name: i.headerName,
    botId: i.bot.botId,
    clientId: i.bot.clientId,
    clientSecret: i.bot.clientSecret,
    phone: i.bot.phone,
  }));
}

/** Trova un bot per botId (per compatibilità con il codice esistente) */
export function getBotByBotId(botId: string) {
  const instance = instancesByBotIdMap.get(botId);
  if (!instance) return null;
  return {
    id: instance.bot.botId,
    name: instance.headerName,
    botId: instance.bot.botId,
    clientId: instance.bot.clientId,
    clientSecret: instance.bot.clientSecret,
    phone: instance.bot.phone,
  };
}
