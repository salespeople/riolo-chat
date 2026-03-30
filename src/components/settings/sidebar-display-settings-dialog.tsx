'use client';

import React, { useEffect, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useSidebarDisplay, type DisplaySettings } from './sidebar-display-provider';
import type { SendPulseBotVariable } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';


interface SidebarDisplaySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  botVariables: SendPulseBotVariable[];
  isLoading: boolean;
}

const mainSectionLabels: Omit<Record<keyof DisplaySettings, string>, 'contactDetails' | 'variables'> = {
  pauseAutomation: "Pausa Automazione",
  tags: "Tags",
  operator: "Operatore Assegnato",
};

const detailFieldLabels: Record<keyof DisplaySettings['contactDetails']['fields'], string> = {
  phone: "Telefono",
  contactId: "Contact ID",
  status: "Stato",
  isChatOpened: "Chat Aperta",
  lastActivity: "Ultima Attività",
};

export default function SidebarDisplaySettingsDialog({
  isOpen,
  onClose,
  botVariables,
  isLoading: isLoadingProps,
}: SidebarDisplaySettingsDialogProps) {
  const { displaySettings, setDisplaySettings, initializeVariableSettings, isDisplaySettingsLoading } = useSidebarDisplay();
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const botVariableNames = useMemo(() => botVariables.map(v => v.name).filter(name => name !== 'GoogleAccessToken'), [botVariables]);

  useEffect(() => {
    if (isAdmin && botVariableNames.length > 0) {
      initializeVariableSettings(botVariableNames);
    }
  }, [botVariableNames, initializeVariableSettings, isAdmin]);


  const handleMainToggle = (key: keyof Pick<DisplaySettings, 'pauseAutomation' | 'tags' | 'operator'>) => {
    if (!isAdmin) return;
    setDisplaySettings(draft => {
      draft[key] = !draft[key];
    });
  };

  const handleSectionToggle = (key: 'contactDetails' | 'variables') => {
    if (!isAdmin) return;
    setDisplaySettings(draft => {
        draft[key].showSection = !draft[key].showSection;
    });
  };

  const handleDetailToggle = (key: keyof DisplaySettings['contactDetails']['fields']) => {
    if (!isAdmin) return;
      setDisplaySettings(draft => {
          draft.contactDetails.fields[key] = !draft.contactDetails.fields[key];
      });
  };
  
  const handleVariableToggle = (variableName: string) => {
    if (!isAdmin) return;
      setDisplaySettings(draft => {
          draft.variables.fields[variableName] = !draft.variables.fields[variableName];
      });
  };

  const isLoading = isDisplaySettingsLoading || isLoadingProps;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impostazioni Visualizzazione Sidebar</DialogTitle>
          <DialogDescription>
            Scegli quali sezioni e campi mostrare nella sidebar. Le modifiche si applicano solo a questa istanza.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="py-4 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        ) : (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            
            <div className="flex items-center justify-between">
              <Label htmlFor="switch-contactDetails" className="font-semibold text-base">
                Dettagli Contatto
              </Label>
              <Switch
                id="switch-contactDetails"
                checked={displaySettings.contactDetails.showSection}
                onCheckedChange={() => handleSectionToggle('contactDetails')}
                disabled={!isAdmin}
              />
            </div>
             {displaySettings.contactDetails.showSection && (
                <div className="space-y-3 pl-6 border-l ml-2">
                    {Object.keys(detailFieldLabels).map((key) => (
                        <div key={key} className="flex items-center gap-3">
                            <Checkbox
                                id={`check-detail-${key}`}
                                checked={displaySettings.contactDetails.fields[key as keyof typeof detailFieldLabels]}
                                onCheckedChange={() => handleDetailToggle(key as keyof typeof detailFieldLabels)}
                                disabled={!isAdmin}
                            />
                            <Label htmlFor={`check-detail-${key}`} className="font-normal text-sm">
                                {detailFieldLabels[key as keyof typeof detailFieldLabels]}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            <Separator />
            
            <div className="flex items-center justify-between">
              <Label htmlFor="switch-variables" className="font-semibold text-base">
                Variabili
              </Label>
              <Switch
                id="switch-variables"
                checked={displaySettings.variables.showSection}
                onCheckedChange={() => handleSectionToggle('variables')}
                disabled={!isAdmin}
              />
            </div>
            {displaySettings.variables.showSection && (
                <div className="space-y-3 pl-6 border-l ml-2">
                     {botVariableNames.map((name) => (
                        <div key={name} className="flex items-center gap-3">
                            <Checkbox
                                id={`check-var-${name}`}
                                checked={displaySettings.variables.fields[name] ?? true}
                                onCheckedChange={() => handleVariableToggle(name)}
                                disabled={!isAdmin}
                            />
                            <Label htmlFor={`check-var-${name}`} className="font-normal text-sm">
                                {name}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
            
            <Separator />

            {Object.keys(mainSectionLabels).map((key) => (
                <div key={key} className="flex items-center justify-between">
                <Label htmlFor={`switch-${key}`} className="font-semibold text-base">
                    {mainSectionLabels[key as keyof typeof mainSectionLabels]}
                </Label>
                <Switch
                    id={`switch-${key}`}
                    checked={displaySettings[key as keyof typeof mainSectionLabels]}
                    onCheckedChange={() => handleMainToggle(key as keyof typeof mainSectionLabels)}
                    disabled={!isAdmin}
                />
                </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}