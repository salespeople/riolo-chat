
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Picker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface NoteInputProps {
  onAddNote: (noteText: string) => Promise<void>;
}

export default function NoteInput({ onAddNote }: NoteInputProps) {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmitting(true);
    await onAddNote(noteText);
    setNoteText('');
    setIsSubmitting(false);
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setNoteText(prev => prev + emojiObject.emoji);
  };

  return (
    <div className="flex items-center gap-2">
      <Textarea
        placeholder="Scrivi una nota interna..."
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        className="flex-1 resize-none bg-card py-3 min-h-[52px]"
        rows={1}
        disabled={isSubmitting}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isSubmitting}>
            <Smile className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0 mb-2">
          <Picker onEmojiClick={onEmojiClick} />
        </PopoverContent>
      </Popover>
      <Button onClick={handleAddNote} disabled={isSubmitting || !noteText.trim()} size="icon">
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </div>
  );
}
