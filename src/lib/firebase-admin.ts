
import admin from "firebase-admin";

let adminApp: admin.app.App;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    if (!process.env.SERVICE_ACCOUNT_KEY) {
      // Questo è l'errore più comune in produzione.
      const errorMessage = "ERRORE DI CONFIGURAZIONE DEL SERVER: La variabile d'ambiente SERVICE_ACCOUNT_KEY non è stata trovata. L'applicazione non può autenticarsi con i servizi Firebase sul backend. Vai nella console di Firebase -> Hosting -> Gestisci backend (nextjs-server) -> Secret e assicurati che il secret SERVICE_ACCOUNT_KEY esista e contenga il JSON completo della tua chiave di servizio.";
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    console.log("✅ Initializing Firebase Admin from SERVICE_ACCOUNT_KEY env var");
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error) {
    const initErrorMessage = "❌ Inizializzazione del Firebase Admin SDK fallita. Questo potrebbe essere dovuto a un file di chiave di servizio JSON malformato o a permessi IAM insufficienti per l'account di servizio.";
    console.error(initErrorMessage, error);
    throw new Error(
      `${initErrorMessage} ` +
        (error instanceof Error ? error.message : String(error))
    );
  }
}

function ensureAdminAppInitialized() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

export const getDb = () => {
  const app = ensureAdminAppInitialized();
  return admin.firestore(app);
};

export const getAuthAdmin = () => {
  const app = ensureAdminAppInitialized();
  return admin.auth(app);
};
