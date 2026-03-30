'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="mt-4 text-2xl font-bold">Si è verificato un errore</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Qualcosa è andato storto. Puoi provare a ricaricare la pagina o tornare indietro.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                    Dettagli errore: {error.message}
                </p>
            </CardContent>
            <CardFooter className="flex justify-center gap-2">
                <Button onClick={() => reset()}>
                    Riprova
                </Button>
                 <Button variant="outline" onClick={() => window.history.back()}>
                    Torna indietro
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
