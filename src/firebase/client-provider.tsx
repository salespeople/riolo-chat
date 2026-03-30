
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Inizializza Firebase solo se non è già stato fatto
function initializeFirebase(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Inizializza Firebase sul lato client, una volta per montaggio del componente.
    const app = initializeFirebase();
    return getSdks(app);
  }, []); // L'array di dipendenze vuoto garantisce che venga eseguito solo una volta

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      functions={null} // Functions are not used
    >
      {children}
    </FirebaseProvider>
  );
}
