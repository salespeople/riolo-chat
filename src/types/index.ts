import type { z } from 'zod';
import type { userInputSchema, userEditSchema, userRoleSchema } from '@/types/schemas';


export interface User {
  id: string; // phone number as string
  name: string;
  avatar: string;
}

export interface Bot {
  id: string;
  name: string;
  botId: string;
  phone: string;
  headerColor?: string;
  headerTitle?: string;
  logoUrl?: string;
  logoEmoji?: string;
  isActive?: boolean;
}

interface InteractiveButton {
  reply: {
    id: string;
    title: string;
  };
}

interface InteractiveButtonReply {
  id: string;
  title: string;
}

interface InteractiveAction {
  buttons: InteractiveButton[];
}

interface InteractiveContent {
  type: 'button' | 'button_reply' | 'list_reply';
  body?: {
    text: string;
  };
  action?: InteractiveAction;
  button_reply?: InteractiveButtonReply;
}

export interface Message {
  id: string;
  sender: User;
  text?: string;
  timestamp: string;
  status?: number; // Added status field
  type: 'text' | 'image' | 'document' | 'unsupported' | 'interactive' | 'template' | 'userInput' | 'flow' | 'operator' | 'operator_note';
  operatorData?: { // Added for messages of type 'operator'
    name: string | null;
    id: number | null;
  };
  interactive?: InteractiveContent;
  audioUrl?: string;
  file?: File;
  imageUrl?: string;
  filename?: string;
  templateBody?: string;
  sentBy?: {
    id: number;
    email: string;
    firstname: string;
  }
}

export interface Chat {
  id: string;
  contactId: string;
  botId: string;
  botName: string;
  user: User;
  messages: Message[];
  messagesLoaded?: boolean;
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageTimestamp: string;
  lastActivityAt: string | null;
  isChatOpened: boolean;
  // Detailed contact info, loaded on-demand
  details: Partial<SendPulseContact>;
  detailsLoaded?: boolean;
  notes?: SendPulseNote[];
  notesLoaded?: boolean | 'loading' | 'error';
  notesError?: string | null;
}

export interface ChatFilters {
  status: 'all' | 'open' | 'closed';
  read: 'all' | 'read' | 'unread';
  assignment: 'all' | 'assigned_to_me' | 'unassigned' | 'assigned_to_operator';
  operatorId: string | null;
  sort: 'recent' | 'oldest';
}


export interface QuickReply {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'document';
  attachment?: string | null; // URL to the attachment
  attachmentName?: string | null; // Name of the attached file
  botId?: string; // Replaced instanceId
  createdAt?: any; // To hold serverTimestamp
}

export interface PrivacyConsent {
  id: string;
  contactId: string;
  phone: string;
  timestamp: any;
  consent: boolean;
}


// Based on /whatsapp/chats endpoint
export interface SendPulseApiChat {
  inbox_last_message: {
    id: string;
    contact_id: string;
    bot_id: string;
    type: 'text' | 'image' | 'document' | 'interactive' | 'template' | 'unsupported' | 'operator_note';
    direction: number; // 1 for incoming, 2 for outgoing
    status: number;
    created_at: string;
    data: {
      text?: { body: string; };
      image?: { caption?: string; };
      document?: { filename?: string; caption?: string; };
      template?: { name: string; };
      note?: { text: string };
      [key: string]: any;
    };
  } | null;
  inbox_unread: number;
  contact: SendPulseContact; // Use the detailed contact type here
}


// Based on /whatsapp/chats/messages endpoint
export interface SendPulseApiMessage {
  id: string;
  contact_id: string;
  bot_id: string;
  type: 'text' | 'image' | 'document' | 'interactive' | 'template' | 'unsupported' | 'userInput' | 'operator' | 'operator_note';
  direction: number;
  status: number;
  created_at: string;
  sent_by?: {
    id: number;
    email: string;
    firstname: string;
  };
  data: {
    type: string | string[];
    text?: { body: string };
    image?: { link: string; caption?: string; url?: string; mime_type?: string; };
    document?: { link: string; filename: string; caption?: string; url?: string; };
    interactive?: InteractiveContent;
    template?: WhatsAppTemplate | { name: string; language: string; };
    operator?: {
      user_id: number;
      username: string;
    } | null;
    note?: { text: string; };
    [key: string]: any;
  };
}

export interface SendPulseContactOperator {
  user_id: number;
  username: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

export interface VariablePayload {
  variable_name: string;
  variable_value: string;
}

export interface SendPulseContact {
  id: string;
  bot_id: string;
  status: 1 | 2 | 3 | 4; // 1-active, 2-unsubscribed, 3-disabled, 4-blocked
  channel_data: {
    phone: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    name: string;
    language_code: string | null;
    photo?: string | null;
  };
  tags: string[];
  variables: Record<string, any>;
  is_chat_opened: boolean;
  last_activity_at: string;
  automation_paused_until: string | null;
  created_at: string;
  operator: SendPulseContactOperator | null;
  source?: string;
  inbox_unread?: number;
}

export interface AddContactApiResponse {
  success: boolean;
  data?: {
    contact_id: string;
  };
  error?: string; // General fallback error message
  errors?: {
    phone?: string[]; // Specific field errors
    [key: string]: string[] | undefined;
  };
}

export interface SendPulseContactAPIResponse {
  success: boolean;
  data?: SendPulseContact;
  error?: string;
}


// Based on /whatsapp/templates
export interface WhatsAppTemplateComponent {
  type: 'BODY' | 'HEADER' | 'FOOTER' | 'BUTTONS';
  text?: string;
  // Add other possible fields for header, buttons etc. if needed
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  components: WhatsAppTemplateComponent[];
}


// Based on /whatsapp/flows
export interface SendPulseFlow {
  id: string;
  bot_id: string;
  name: string;
  status: number;
  created_at: string;
}

// Based on /whatsapp/variables
export interface SendPulseBotVariable {
  id: string;
  bot_id: string;
  name: string;
  value_type: number; // 1 for string
  created_at: string;
}

// Based on /whatsapp/tags
export interface SendPulseTag {
  id: string;
  name: string;
  count: number;
  created_at: string;
}

export interface ThemeSettings {
  primaryColor: string;
  accentColor: string;
  headerName: string;
  logoUrl: string;
  logoEmoji: string;
}

// Based on /whatsapp/contacts/notes
export interface SendPulseNote {
  _id: string;
  user_id: number;
  bot_id: string;
  contact_id: string;
  sent_by: {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    avatar: string | null;
  };
  text: string;
  type: 'operator_note';
  created_at: string;
}


export type UserInput = z.infer<typeof userInputSchema>;
export type UserEditInput = z.infer<typeof userEditSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
