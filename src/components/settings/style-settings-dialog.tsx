'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTheme, DEFAULT_THEME } from '@/components/layout/theme-provider';
import { useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useBotStore } from '@/stores/bot-store';
import { doc, setDoc } from 'firebase/firestore';

// Funzione per convertire HEX in HSL
function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '');

  const bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDisplay = Math.round(h * 360);
  const sDisplay = Math.round(s * 100);
  const lDisplay = Math.round(l * 100);

  return `${hDisplay} ${sDisplay}% ${lDisplay}%`;
}

interface StyleSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StyleSettingsDialog({
  isOpen,
  onClose,
}: StyleSettingsDialogProps) {
  
  const { theme, isThemeLoading } = useTheme();
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_THEME.primaryColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_THEME.accentColor);
  const [headerName, setHeaderName] = useState(DEFAULT_THEME.headerName);
  
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { activeBotId, bots } = useBotStore();
  
  useEffect(() => {
    if (isOpen && !isThemeLoading) {
        setPrimaryColor(theme.primaryColor);
        setAccentColor(theme.accentColor);
        setHeaderName(theme.headerName);
    }
  }, [isOpen, theme, isThemeLoading]);

  const applyPreviewColors = (primary: string, accent: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHsl(primary));
    root.style.setProperty('--brand', hexToHsl(primary));
    root.style.setProperty('--accent', hexToHsl(accent));
    root.style.setProperty('--destructive', hexToHsl(accent));
  };
  
  const handlePrimaryColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setPrimaryColor(newColor);
    applyPreviewColors(newColor, accentColor);
  };

  const handleAccentColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setAccentColor(newColor);
    applyPreviewColors(primaryColor, newColor);
  };

  const handleSave = async () => {
    if (!firestore || !activeBotId) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Nessun bot selezionato.' });
      return;
    }

    const activeBot = bots.find(b => b.botId === activeBotId);
    if (!activeBot) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Bot non trovato.' });
      return;
    }

    setIsSaving(true);

    try {
        // Salva direttamente nel documento del bot
        const botDocRef = doc(firestore, 'bots', activeBot.id);
        await setDoc(botDocRef, {
            headerColor: primaryColor,
            headerTitle: headerName,
        }, { merge: true });

        toast({ title: 'Impostazioni salvate', description: 'Lo stile è stato aggiornato con successo.' });
        onClose();
    } catch (error) {
        console.error("Error saving theme:", error);
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare le impostazioni.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (!firestore || !activeBotId) return;

    const activeBot = bots.find(b => b.botId === activeBotId);
    if (!activeBot) return;

    setIsSaving(true);
    try {
        const botDocRef = doc(firestore, 'bots', activeBot.id);
        await setDoc(botDocRef, {
            headerColor: DEFAULT_THEME.primaryColor,
            headerTitle: '',
        }, { merge: true });

        toast({ title: 'Impostazioni ripristinate', description: 'Lo stile per questo bot è tornato ai valori predefiniti.' });
        onClose();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile ripristinare le impostazioni.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleClose = () => {
    applyPreviewColors(theme.primaryColor, theme.accentColor);
    onClose();
  }

  const isLoading = isThemeLoading || isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizza Stile</DialogTitle>
          <DialogDescription>
            Le modifiche verranno applicate al bot attivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
             <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Nome Header</h3>
                <Input
                    id="headerName"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="Inserisci nome header"
                    disabled={isLoading}
                />
            </div>
            <Separator />
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Colori</h3>
                <ColorInput label="Colore Primario" value={primaryColor} onChange={handlePrimaryColorChange} disabled={isLoading} />
                <ColorInput label="Colore Secondario" value={accentColor} onChange={handleAccentColorChange} disabled={isLoading} />
            </div>
        </div>
        <DialogFooter className="justify-between sm:justify-between w-full">
          <Button variant="ghost" onClick={handleReset} disabled={isLoading}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reimposta'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Annulla
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !activeBotId}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva e Chiudi'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente helper per l'input con picker
const ColorInput = ({ label, value, onChange, disabled }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled?: boolean }) => {
    return (
        <div className="flex items-center justify-between">
            <Label htmlFor={label.toLowerCase()} className="font-medium">{label}</Label>
            <div className="flex items-center gap-2">
                <Input
                    id={`${label.toLowerCase()}Hex`}
                    value={value}
                    onChange={onChange}
                    className="w-24 p-1 h-8"
                    disabled={disabled}
                />
                <input
                    id={label.toLowerCase()}
                    type="color"
                    value={value}
                    onChange={onChange}
                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent disabled:cursor-not-allowed"
                    title={`Seleziona un ${label.toLowerCase()}`}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

// Input di ShadCN per evitare errori
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input";
