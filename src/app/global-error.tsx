'use client'
 
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-bold">Si è verificato un errore</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Qualcosa è andato storto. Per favore, ricarica la pagina.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                        Dettagli errore: {error.message}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={() => reset()}>Riprova</Button>
                </CardFooter>
            </Card>
        </div>
      </body>
    </html>
  )
}
