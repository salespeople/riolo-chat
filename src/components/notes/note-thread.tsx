
"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StickyNote, Trash2, Loader2, Pencil, Save, X } from 'lucide-react';
import type { SendPulseNote, Message } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';


interface NoteThreadProps {
  notes: Message[]; // Using Message type as it's the source from chat.messages
  isLoading: boolean;
  onDeleteNote?: (noteId: string) => Promise<void>;
  deletingNoteId?: string | null;
  editingNoteId: string | null;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditNote: (note: Message) => void;
  onSaveNote: (noteId: string) => void;
  onCancelEdit: () => void;
}

export default function NoteThread({ 
    notes, 
    isLoading, 
    onDeleteNote, 
    deletingNoteId,
    editingNoteId,
    editingText,
    onEditingTextChange,
    onEditNote,
    onSaveNote,
    onCancelEdit
}: NoteThreadProps) {
  return (
    <ScrollArea className="h-full">
      {isLoading ? (
        <div className="space-y-3 p-1">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
          <StickyNote className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Nessuna nota trovata</p>
          <p className="text-xs">Aggiungi la prima nota per questo contatto.</p>
        </div>
      ) : (
        <div className="space-y-3 p-1">
          {notes.map((note) => (
            <div key={note.id} className="bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-lg p-3 my-2 text-sm shadow-sm group">
              {editingNoteId === note.id ? (
                 <div className="space-y-2">
                    <Textarea 
                        value={editingText}
                        onChange={(e) => onEditingTextChange(e.target.value)}
                        className="bg-white/70"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancelEdit}>Annulla</Button>
                        <Button size="sm" onClick={() => onSaveNote(note.id)}>Salva</Button>
                    </div>
                 </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words">{note.text}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-yellow-700/80">
                      {note.sentBy?.firstname} - {note.timestamp && format(new Date(note.timestamp), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </p>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditNote && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-yellow-700/60 hover:text-yellow-800 hover:bg-yellow-200/50"
                                onClick={() => onEditNote(note)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                        {onDeleteNote && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-yellow-700/60 hover:text-red-500 hover:bg-yellow-200/50"
                            onClick={() => onDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                        >
                            {deletingNoteId === note.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                            <Trash2 className="h-4 w-4" />
                            )}
                        </Button>
                        )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

    