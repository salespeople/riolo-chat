'use client';

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Smile, Send, Image as ImageIcon, FileText, Video, MessageSquareQuote, ChevronsUpDown, Check, Bot, Loader2, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Picker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import ImagePreviewDialog from "@/components/shared/image-preview-dialog";
import QuickReplyDialog from "@/components/shared/quick-reply-dialog";
import ManageQuickRepliesDialog from '@/components/shared/manage-quick-replies-dialog';
import type { Chat, QuickReply, WhatsAppTemplate, SendPulseFlow } from "@/types";
import { getWhatsappTemplates, getWhatsappFlows } from "@/lib/sendpulse";
import TemplatePreviewDialog from "@/components/shared/template-preview-dialog";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useFirebaseApp, useAuth } from "@/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/storage";


interface MessageInputProps {
  botId: string | undefined;
  onSendMessage: (text: string, file?: File) => void;
  onSendTemplate: (template: WhatsAppTemplate) => void;
  onSendFlow: (flow: SendPulseFlow) => void;
  onSendQuickReply: (reply: QuickReply) => void;
  isWindowExpired: boolean;
}

const MessageInput = React.forwardRef<HTMLTextAreaElement, MessageInputProps>(({
  botId,
  onSendMessage,
  onSendTemplate,
  onSendFlow,
  onSendQuickReply,
  isWindowExpired
}, ref) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);
  const [isManageQuickReplyOpen, setIsManageQuickReplyOpen] = useState(false);

  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const auth = useAuth();
  const { toast } = useToast();

  const quickRepliesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'quickReplies') : null, [firestore]);
  const { data: allQuickReplies, isLoading: isLoadingQuickReplies } = useCollection<QuickReply>(quickRepliesCollection);

  // Template handling state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isPreviewTemplateOpen, setIsPreviewTemplateOpen] = useState(false);

  // Flow handling state
  const [flows, setFlows] = useState<SendPulseFlow[]>([]);
  const [isFlowsLoading, setIsFlowsLoading] = useState(false);
  const [isFlowPopoverOpen, setIsFlowPopoverOpen] = useState(false);

  const filteredQuickReplies = useMemo(() => {
    if (!allQuickReplies) return [];
    return allQuickReplies.filter(reply => {
      return reply.botId === botId || !reply.botId;
    });
  }, [allQuickReplies, botId]);


  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    if (isWindowExpired && botId) {
      getWhatsappTemplates(botId).then(setTemplates);
    }
  }, [isWindowExpired, botId]);


  const handleSendText = () => {
    const textarea = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
    if (!textarea) return;

    const text = textarea.value.trim();
    if (text) {
      onSendMessage(text);
      textarea.value = "";
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    const textarea = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + emojiObject.emoji + text.substring(end);

    textarea.value = newText;
    textarea.focus();
    const newCursorPosition = start + emojiObject.emoji.length;
    textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
    handleInput({ currentTarget: textarea } as React.FormEvent<HTMLTextAreaElement>);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewImage('document');
      }
    }
    e.target.value = '';
  };

  const handleSendFile = () => {
    if (selectedFile) {
      onSendMessage(caption, selectedFile);
      handleClosePreview();
    }
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setCaption('');
  };

  const handleSendQuickReply = (reply: QuickReply) => {
    onSendQuickReply(reply);
    setIsQuickReplyOpen(false);
  };

  const handleSaveQuickReply = async (replyData: Partial<QuickReply>) => {
    if (!firestore || !quickRepliesCollection || !auth) {
      throw new Error("Firestore not initialized or user not authenticated.");
    }

    const dataToSave = {
      title: replyData.title!,
      content: replyData.content!,
      type: replyData.type!,
      attachment: replyData.attachment || null,
      attachmentName: replyData.attachmentName || null,
      createdAt: serverTimestamp(),
      botId: botId,
    };

    if (replyData.id) {
      const docRef = doc(firestore, "quickReplies", replyData.id);
      const { createdAt, ...updateData } = dataToSave;
      await updateDoc(docRef, updateData);
    } else {
      await addDoc(quickRepliesCollection, dataToSave);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    if (!firestore) throw new Error("Firestore not initialized.");
    const docRef = doc(firestore, "quickReplies", id);
    await deleteDoc(docRef);
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewTemplateOpen(true);
    setIsTemplatePopoverOpen(false);
  }

  const handleSendTemplate = () => {
    if (selectedTemplate) {
      onSendTemplate(selectedTemplate);
    }
    setIsPreviewTemplateOpen(false);
    setSelectedTemplate(null);
  }

  const handleFetchFlows = async () => {
    if (!botId) return;
    setIsFlowsLoading(true);
    try {
      const fetchedFlows = await getWhatsappFlows(botId);
      setFlows(fetchedFlows);
    } catch (error) {
      console.error("Failed to fetch flows", error);
    } finally {
      setIsFlowsLoading(false);
    }
  }

  const handleFlowSelect = (flow: SendPulseFlow) => {
    onSendFlow(flow);
    setIsFlowPopoverOpen(false);
  }

  const handleManageQuickReplies = () => {
    setIsQuickReplyOpen(false);
    setIsManageQuickReplyOpen(true);
  };

  const handleCloseManageQuickReplies = () => {
    setIsManageQuickReplyOpen(false);
  }

  const TemplateSelector = () => (
    <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isTemplatePopoverOpen}
          className="w-full justify-between bg-card"
        >
          Seleziona un template...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Cerca template..." />
          <CommandEmpty>Nessun template trovato.</CommandEmpty>
          <CommandGroup>
            {templates.map((template) => (
              <CommandItem
                key={template.id}
                value={template.name}
                onSelect={() => handleTemplateSelect(template)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedTemplate?.id === template.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {template.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onClose={handleClosePreview}
        onSend={handleSendFile}
        imageUrl={previewImage !== 'document' ? previewImage : null}
        file={selectedFile}
        caption={caption}
        setCaption={setCaption}
      />
      <QuickReplyDialog
        isOpen={isQuickReplyOpen}
        onClose={() => setIsQuickReplyOpen(false)}
        onSend={handleSendQuickReply}
        quickReplies={filteredQuickReplies}
        onManage={handleManageQuickReplies}
        isLoading={isLoadingQuickReplies}
      />
      <ManageQuickRepliesDialog
        isOpen={isManageQuickReplyOpen}
        onClose={handleCloseManageQuickReplies}
        quickReplies={filteredQuickReplies}
        onSave={handleSaveQuickReply}
        onDelete={handleDeleteQuickReply}
      />
      <TemplatePreviewDialog
        isOpen={isPreviewTemplateOpen}
        onClose={() => setIsPreviewTemplateOpen(false)}
        onSend={handleSendTemplate}
        template={selectedTemplate}
      />

      {isWindowExpired ? (
        <TemplateSelector />
      ) : (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" side="top" align="start">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Immagine</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                <span>File</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Video className="mr-2 h-4 w-4" />
                <span>Video</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={() => setIsQuickReplyOpen(true)}>
            <MessageSquareQuote className="h-5 w-5" />
          </Button>

          <Popover open={isFlowPopoverOpen} onOpenChange={setIsFlowPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleFetchFlows}>
                <Bot className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 mb-2">
              <Command>
                <CommandInput placeholder="Cerca flow..." />
                <CommandList>
                  {isFlowsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>Nessun flow trovato.</CommandEmpty>
                      <CommandGroup>
                        {flows.map((flow) => (
                          <CommandItem
                            key={flow.id}
                            value={flow.name}
                            onSelect={() => handleFlowSelect(flow)}
                          >
                            {flow.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Textarea
            ref={ref}
            onInput={handleInput}
            onKeyDown={handleKeyPress}
            placeholder="Scrivi un messaggio..."
            className="flex-1 py-3 resize-none min-h-[52px] max-h-[200px] bg-card"
            rows={1}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0 mb-2">
              <Picker onEmojiClick={onEmojiClick} />
            </PopoverContent>
          </Popover>

          <Button onClick={handleSendText} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
            <Send className="h-5 w-5 text-primary-foreground" />
          </Button>
        </div>
      )}
    </>
  );
});

MessageInput.displayName = "MessageInput";
export default MessageInput;
