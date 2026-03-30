
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { WhatsAppTemplate } from '@/types';

interface TemplatePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  template: WhatsAppTemplate | null;
}

export default function TemplatePreviewDialog({
  isOpen,
  onClose,
  onSend,
  template,
}: TemplatePreviewDialogProps) {
  if (!template) {
    return null;
  }

  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const footerComponent = template.components.find(c => c.type === 'FOOTER');

  const ClickableMessage = ({ text }: { text?: string }) => {
    if (!text) return null;
  
    const lines = text.split('\n');
  
    return (
      <p className="text-sm whitespace-pre-wrap">
        {lines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line.split(/(\*.*?\*)|(_.*?_)/g).filter(Boolean).map((part, i) => {
              if (part.startsWith('*') && part.endsWith('*')) {
                return <strong key={i}>{part.slice(1, -1)}</strong>;
              }
              if (part.startsWith('_') && part.endsWith('_')) {
                return <em key={i}>{part.slice(1, -1)}</em>;
              }
              return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anteprima Template: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/80 rounded-md border space-y-2">
                {bodyComponent && bodyComponent.text && (
                    <ClickableMessage text={bodyComponent.text} />
                )}
                {footerComponent && footerComponent.text && (
                    <>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground italic">
                            {footerComponent.text}
                        </p>
                    </>
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={onSend}>
            Invia Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
