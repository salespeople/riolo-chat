
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Settings, Palette, BookUser, Wrench, LogOut, Upload, Users, View, Users2, FileText as ApiIcon, Bot } from 'lucide-react';
import AddContactDialog from '@/components/contacts/add-contact-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StyleSettingsDialog from '@/components/settings/style-settings-dialog';
import ContactsDialog from '@/components/contacts/contacts-dialog';
import UsersDialog from '@/components/users/users-dialog';
import UsersListDialog from '@/components/users/users-list-dialog';
import { Separator } from '@/components/ui/separator';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import UploadFileDialog from '@/components/shared/upload-file-dialog';
import { useTheme } from './theme-provider';
import { useBotStore } from '@/stores/bot-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SidebarDisplaySettingsDialog from '@/components/settings/sidebar-display-settings-dialog';
import type { Bot, SendPulseBotVariable } from '@/types';
import ApiDocumentationDialog from '@/components/shared/api-documentation-dialog';
import BotsDialog from '@/components/shared/bots-dialog';
import { getWhatsappBotVariables } from '@/lib/sendpulse';

interface HeaderProps {
  onContactAdded: () => void;
  bots: Bot[];
}

export default function Header({ onContactAdded, bots }: HeaderProps) {
  const { activeBotId, setActiveBotId } = useBotStore();
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false);
  const [isSidebarDisplaySettingsOpen, setIsSidebarDisplaySettingsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [isUsersListDialogOpen, setIsUsersListDialogOpen] = useState(false);
  const [isUploadFileDialogOpen, setIsUploadFileDialogOpen] = useState(false);
  const [isApiDocOpen, setIsApiDocOpen] = useState(false);
  const [isBotsDialogOpen, setIsBotsDialogOpen] = useState(false);
  
  const [botVariables, setBotVariables] = useState<SendPulseBotVariable[]>([]);
  const [isLoadingBotVariables, setIsLoadingBotVariables] = useState(false);
  
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { theme, isThemeLoading } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const fetchBotVariables = async () => {
        if (!bots || bots.length === 0) return;
        setIsLoadingBotVariables(true);
        const allBotVariablesPromises = bots.map(bot => getWhatsappBotVariables(bot.id));
        const variablesArrays = await Promise.all(allBotVariablesPromises);
        const flatVariables = variablesArrays.flat();
        const uniqueVariables = Array.from(new Map(flatVariables.map(item => [item.name, item])).values());
        setBotVariables(uniqueVariables);
        setIsLoadingBotVariables(false);
    };
    
    fetchBotVariables();
  }, [bots]);
  
  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const canViewSettings = user?.role === 'superadmin';
  const canSwitchBot = user?.role === 'superadmin' || bots.length > 1;

  // Find the active bot to display its name and phone
  const activeBot = activeBotId
    ? bots.find(b => b.botId === activeBotId)
    : bots[0];

  const botDisplayLabel = activeBot
    ? `${activeBot.name}${activeBot.phone ? ` (${activeBot.phone})` : ''}`
    : '';

  return (
    <>
      <AddContactDialog 
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onContactAdded={onContactAdded}
        bots={bots}
      />
      <StyleSettingsDialog
        isOpen={isStyleSettingsOpen}
        onClose={() => setIsStyleSettingsOpen(false)}
      />
       <SidebarDisplaySettingsDialog
        isOpen={isSidebarDisplaySettingsOpen}
        onClose={() => setIsSidebarDisplaySettingsOpen(false)}
        botVariables={botVariables}
        isLoading={isLoadingBotVariables}
      />
      <ContactsDialog
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        onOpenChat={() => {}}
        bots={bots}
      />
      {canViewSettings && (
        <>
            <UsersDialog
                isOpen={isUsersDialogOpen}
                onClose={() => setIsUsersDialogOpen(false)}
            />
            <BotsDialog
                isOpen={isBotsDialogOpen}
                onClose={() => setIsBotsDialogOpen(false)}
            />
        </>
      )}
      <UsersListDialog
        isOpen={isUsersListDialogOpen}
        onClose={() => setIsUsersListDialogOpen(false)}
      />
      <UploadFileDialog
        isOpen={isUploadFileDialogOpen}
        onClose={() => setIsUploadFileDialogOpen(false)}
      />
      <ApiDocumentationDialog
        isOpen={isApiDocOpen}
        onClose={() => setIsApiDocOpen(false)}
      />
      <header className="bg-brand text-brand-foreground shadow-md">
        <div className="w-full flex h-16 items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-4">
            {isThemeLoading ? (
               <Skeleton className="h-10 w-10 rounded-full" />
            ) : theme.logoEmoji ? (
                <span className="text-3xl leading-none" role="img" aria-label="logo">{theme.logoEmoji}</span>
            ) : null}
            {isThemeLoading ? (
                 <Skeleton className="h-6 w-48" />
            ) : (
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold hidden md:block">
                        {botDisplayLabel || theme.headerName}
                    </h1>
                    {canSwitchBot && bots.length > 0 && (
                        <Select value={activeBotId || "all"} onValueChange={(val) => setActiveBotId(val === "all" ? null : val)}>
                            <SelectTrigger className="w-[220px] h-8 bg-brand-foreground/10 border-none">
                                <SelectValue placeholder="Seleziona Bot" />
                            </SelectTrigger>
                            <SelectContent>
                                {bots.length > 1 && <SelectItem value="all">Tutti i Bot</SelectItem>}
                                {bots.map(bot => (
                                    <SelectItem key={bot.id} value={bot.botId}>
                                        {bot.logoEmoji || '🤖'} {bot.name}{bot.phone ? ` (${bot.phone})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground">
                      <Wrench className="mr-2 h-4 w-4" />
                      Strumenti
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => setIsAddContactOpen(true)} disabled={bots.length === 0}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Aggiungi Contatto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsContactsOpen(true)}>
                    <BookUser className="mr-2 h-4 w-4" />
                    <span>Cerca Contatto</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setIsUsersListDialogOpen(true)}>
                    <Users2 className="mr-2 h-4 w-4" />
                    <span>Lista Operatori</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsUploadFileDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Carica File</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            {canViewSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground">
                      <Settings className="mr-2 h-4 w-4" />
                      Impostazioni
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsUsersDialogOpen(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gestione Utenti</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsBotsDialogOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" />
                    <span>Gestione Bot</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsStyleSettingsOpen(true)}>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Stile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSidebarDisplaySettingsOpen(true)}>
                    <View className="mr-2 h-4 w-4" />
                    <span>Visualizzazione Sidebar</span>
                  </DropdownMenuItem>
                   <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsApiDocOpen(true)}>
                    <ApiIcon className="mr-2 h-4 w-4" />
                    <span>Documentazione API</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

              <Separator orientation="vertical" className="h-8 bg-brand-foreground/20 mx-2" />
               {isUserLoading ? (
                 <Skeleton className="h-10 w-48 rounded-md" />
               ) : user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground h-10">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand-foreground/20 text-brand-foreground">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                           <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
                           <p className="text-xs text-brand-foreground/80 leading-none mt-0.5 italic">{user.email}</p>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
