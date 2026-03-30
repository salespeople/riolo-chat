
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LogOut } from 'lucide-react';
import type { UserProfile } from '@/firebase/auth/use-user';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading, userError } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (userError) {
      setIsLoading(false);
    }
  }, [userError]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (!firestore || !loggedInUser) {
        throw new Error("Autenticazione fallita o database non disponibile.");
      }

      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("Profilo utente non trovato.");
      }

      const userProfile = userDoc.data() as UserProfile;
      

      // REGOLA DI ACCESSO
      const isAdmin = userProfile.role === 'admin';
      const hasAccess = userProfile.role === "superadmin" || (Array.isArray(userProfile.botIds) && userProfile.botIds.length > 0);

      if (isAdmin || hasAccess) {
        // Accesso consentito
        toast({ title: 'Login effettuato', description: 'Accesso completato con successo.' });
        router.push('/');
      } else {
        // Accesso negato
        await signOut(auth);
        throw new Error("Non hai i permessi per accedere a questo ufficio.");
      }

    } catch (error: any) {
      console.error("Login failed:", error);

      let errorMessage = "Credenziali non valide o errore di rete.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Email o password non corrette.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Il formato dell\'email non è valido.';
            break;
          default:
            errorMessage = 'Errore di autenticazione. Riprova.';
        }
      }

      toast({ variant: 'destructive', title: 'Login Fallito', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logout effettuato', description: 'Sei stato disconnesso con successo.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile effettuare il logout.' });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Sessione Attiva</CardTitle>
            <CardDescription>
              Sei attualmente loggato come <span className="font-semibold">{user.email}</span>.
              Per continuare, effettua il logout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Effettua il Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
