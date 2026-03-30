

'use server';

import type { Chat, User, Message, SendPulseContact, AddContactApiResponse, SendPulseApiChat, SendPulseApiMessage, SendPulseContactAPIResponse, WhatsAppTemplate, SendPulseFlow, VariablePayload, SendPulseBotVariable, SendPulseTag, Bot } from '@/types';
import { agent } from './data';
import { getAllBots, getBotByBotId } from '@/config/app.config';

// Store the token in memory for reuse, mapped by clientId
const accessTokenCache: Map<string, { token: string; expires: number }> = new Map();

const SENDPULSE_API_BASE_URL = "https://api.sendpulse.com";

async function getAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
    const cached = accessTokenCache.get(clientId);
    if (cached && cached.expires > Date.now()) {
        return cached.token;
    }

    try {
        const response = await fetch(`${SENDPULSE_API_BASE_URL}/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to get SendPulse access token for client ${clientId}:`, errorData);
            return null;
        }

        const data = await response.json();
        const expires = Date.now() + (data.expires_in * 1000);
        accessTokenCache.set(clientId, { token: data.access_token, expires });

        return data.access_token;
    } catch (error) {
        console.error(`Error fetching access token for client ${clientId}:`, error);
        return null;
    }
}

async function fetchFromSendPulse(url: string, bot: Bot, options: RequestInit = {}): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${SENDPULSE_API_BASE_URL}${url}`;

    const token = await getAccessToken(bot.clientId, bot.clientSecret);
    if (!token) {
        throw new Error(`Unable to retrieve access token for bot ${bot.name}.`);
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    const response = await fetch(fullUrl, {
        ...options,
        headers,
        cache: 'no-store', // FORZA il recupero di dati freschi
    });

    if (response.status === 204 || options.method === 'DELETE') {
        if (response.status === 204) return { success: true, data: null };
        const data = await response.json();
        return data.success !== false ? { ...data, success: true } : data;
    }

    const text = await response.text();
    try {
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
            console.error(`SendPulse API Error (${response.status}) on ${fullUrl} for bot ${bot.name}:`, data);
            return data.success === false ? data : { success: false, error: `API request failed with status ${response.status}` };
        }
        return data.success === undefined ? { ...data, success: true } : data;
    } catch (e) {
        console.error(`Failed to parse JSON response from SendPulse on ${fullUrl}. Body:`, text);
        return { success: false, error: 'Failed to parse API response.' };
    }
}

const mapToSendPulseToChat = (apiChat: SendPulseApiChat, botId: string, botName: string): Chat => {
    const contact = apiChat.contact;
    const lastMessage = apiChat.inbox_last_message;

    let lastMessageSnippet = 'Nessun messaggio';
    if (lastMessage && lastMessage.data) {
        switch (lastMessage.type) {
            case 'text':
                lastMessageSnippet = lastMessage.data.text?.body || '[Messaggio di testo vuoto]';
                break;
            case 'image':
                lastMessageSnippet = `🖼️ ${lastMessage.data.image?.caption || 'Immagine'}`;
                break;
            case 'document':
                lastMessageSnippet = `📄 ${lastMessage.data.document?.caption || lastMessage.data.document?.filename || 'Documento'}`;
                break;
            case 'interactive':
                lastMessageSnippet = '[Messaggio interattivo]';
                break;
            case 'template':
                lastMessageSnippet = `Template inviato: ${lastMessage.data.template?.name}`;
                break;
            case 'operator_note':
                lastMessageSnippet = `📝 Nota: ${lastMessage.data.note?.text || '...'}`;
                break;
            case 'unsupported':
            default:
                lastMessageSnippet = '[Messaggio non supportato]';
                break;
        }
    }

    return {
        id: contact.id, // Use contactId as the unique chat identifier
        contactId: contact.id,
        botId: botId,
        botName: botName,
        user: {
            id: String(contact.channel_data.phone),
            name: contact.channel_data.name || String(contact.channel_data.phone),
            avatar: contact.channel_data.photo || '',
        },
        messages: [],
        messagesLoaded: false,
        unreadCount: apiChat.inbox_unread,
        lastMessageSnippet: lastMessageSnippet,
        lastMessageTimestamp: lastMessage?.created_at || contact.last_activity_at || '',
        lastActivityAt: contact.last_activity_at,
        isChatOpened: contact.is_chat_opened,
        details: contact,
        detailsLoaded: true,
    };
};

interface GetChatsResponse {
    chats: Chat[];
    nextLinks: Record<string, string | null>;
}

export async function getChats(): Promise<GetChatsResponse> {
    try {
        const bots = getAllBots();

        if (bots.length === 0) {
            console.log("No bots configured in app.config.ts, returning an empty chat list.");
            return { chats: [], nextLinks: {} };
        }

        const allChatsPromises = bots.map(async (bot) => {
            const { chats, nextLink } = await getChatsForBot(bot);
            return { chats, nextLink, botId: bot.id };
        });

        const results = await Promise.all(allChatsPromises);

        let combinedChats: Chat[] = [];
        const nextLinks: Record<string, string | null> = {};

        results.forEach((result) => {
            combinedChats = [...combinedChats, ...result.chats];
            nextLinks[result.botId] = result.nextLink;
        });

        combinedChats.sort((a: any, b: any) => {
            if (!a.lastMessageTimestamp) return 1;
            if (!b.lastMessageTimestamp) return -1;
            return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
        });

        return { chats: combinedChats, nextLinks };
    } catch (error) {
        console.error("Error in getChats:", error);
        return { chats: [], nextLinks: {} };
    }
}

export async function getChatsForBot(bot: Bot): Promise<{ chats: Chat[], nextLink: string | null }> {
    const response = await fetchFromSendPulse(`/whatsapp/chats?bot_id=${bot.botId}&size=150`, bot);
    if (!response.success || !Array.isArray(response.data)) {
        console.error(`Failed to get chats for bot ${bot.name} or invalid data format:`, response);
        return { chats: [], nextLink: null };
    }
    const chats = response.data.map((apiChat: SendPulseApiChat) => mapToSendPulseToChat(apiChat, bot.id, bot.name));
    return {
        chats,
        nextLink: response.links?.next || null,
    };
}


export async function fetchNextChatPage(nextUrl: string, bot: Bot): Promise<{ chats: Chat[], nextLink: string | null, botId: string } | null> {
    try {
        const response = await fetchFromSendPulse(nextUrl, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error(`Failed to get next page of chats for bot ${bot.name}:`, response);
            return { chats: [], nextLink: null, botId: bot.id };
        }
        const chats = response.data.map((apiChat: SendPulseApiChat) => mapToSendPulseToChat(apiChat, bot.id, bot.name));
        return {
            chats,
            nextLink: response.links?.next || null,
            botId: bot.id,
        };
    } catch (error) {
        console.error(`Error fetching next chat page for bot ${bot.name}:`, error);
        return null;
    }
}

function mapApiMessageToMessage(apiMsg: SendPulseApiMessage, chatUser: User, bot: Bot): Message {
    const sender = apiMsg.direction === 2 ? agent : chatUser;

    const messageType = apiMsg.type || (Array.isArray(apiMsg.data.type) ? apiMsg.data.type[0] : apiMsg.data.type);

    const message: Message = {
        id: apiMsg.id,
        sender: sender,
        timestamp: apiMsg.created_at,
        status: apiMsg.status,
        type: messageType as Message['type'],
        sentBy: apiMsg.sent_by,
    };

    switch (messageType) {
        case 'text':
        case 'userInput':
            message.text = apiMsg.data.text?.body;
            break;
        case 'image':
            message.text = apiMsg.data.image?.caption;
            const imageUrlFromApi = apiMsg.data.image?.url;

            if (imageUrlFromApi) {
                // Usa il proxy per caricare le immagini on-demand nel browser
                message.imageUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrlFromApi)}&botId=${encodeURIComponent(bot.botId)}`;
            } else if (typeof apiMsg.data.image === 'string') {
                message.imageUrl = apiMsg.data.image;
            } else {
                message.imageUrl = apiMsg.data.image?.link;
            }
            break;
        case 'document':
            message.text = apiMsg.data.document?.caption;
            message.imageUrl = apiMsg.data.document?.link || apiMsg.data.document?.url;
            message.filename = apiMsg.data.document?.filename;
            break;
        case 'interactive':
            if (apiMsg.direction === 2) {
                message.text = apiMsg.data.interactive?.body?.text;
            } else {
                message.text = apiMsg.data.interactive?.button_reply?.title;
            }
            message.interactive = apiMsg.data.interactive;
            break;
        case 'template':
            message.text = `Template: ${apiMsg.data.template?.name}`;
            const bodyComponent = (apiMsg.data.template as WhatsAppTemplate | undefined)?.components?.find(c => c.type === 'BODY');
            if (bodyComponent) {
                message.templateBody = bodyComponent.text;
            }
            break;
        case 'operator':
            message.operatorData = {
                name: apiMsg.data.operator?.username || null,
                id: apiMsg.data.operator?.user_id || null,
            };
            break;
        case 'operator_note':
            message.text = apiMsg.data.note?.text;
            break;
        default:
            break;
    }

    return message;
};


function findBotById(botId: string): Bot | null {
    if (!botId) {
        console.error("findBotById called with an invalid botId.");
        return null;
    }
    const bot = getBotByBotId(botId);
    if (!bot) {
        console.error(`Bot with ID ${botId} not found in app.config.ts.`);
        return null;
    }
    return bot as Bot;
}

export async function getMessagesForChat(botId: string, contactId: string, chatUser: User, limit: number = 40): Promise<{ messages: Message[], hasMore: boolean }> {
    const bot = findBotById(botId);
    if (!bot) return { messages: [], hasMore: false };

    try {
        const response = await fetchFromSendPulse(`/whatsapp/chats/messages?contact_id=${contactId}&limit=${limit}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error(`Failed to get messages for contact ${contactId}:`, response);
            return { messages: [], hasMore: false };
        }
        const messages = response.data.map((msg: SendPulseApiMessage) => mapApiMessageToMessage(msg, chatUser, bot));
        const hasMore = response.data.length >= limit;
        return { messages, hasMore };

    } catch (error) {
        console.error(`Error fetching messages for contact ${contactId}:`, error);
        return { messages: [], hasMore: false };
    }
}

export async function loadOlderMessages(botId: string, contactId: string, chatUser: User, beforeMessageId: string, limit: number = 40): Promise<{ messages: Message[], hasMore: boolean }> {
    const bot = findBotById(botId);
    if (!bot) return { messages: [], hasMore: false };

    try {
        const response = await fetchFromSendPulse(`/whatsapp/chats/messages?contact_id=${contactId}&limit=${limit}&before=${beforeMessageId}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            return { messages: [], hasMore: false };
        }
        const messages = response.data.map((msg: SendPulseApiMessage) => mapApiMessageToMessage(msg, chatUser, bot));
        const hasMore = response.data.length >= limit;
        return { messages, hasMore };

    } catch (error) {
        console.error(`Error loading older messages:`, error);
        return { messages: [], hasMore: false };
    }
}


// Other functions (addContact, etc.) need to be updated to accept a botId or bot object.
// Here are a few examples:

export async function markChatAsRead(botId: string, contactId: string): Promise<boolean> {
    const bot = findBotById(botId);
    if (!bot) return false;

    try {
        await fetchFromSendPulse(`/whatsapp/chats/read`, bot, {
            method: 'POST',
            body: JSON.stringify({ bot_id: bot.botId, contact_id: contactId })
        });
        return true;
    } catch (error) {
        console.error(`Failed to mark chat as read for contact ${contactId}:`, error);
        return false;
    }
}

export async function closeChat(botId: string, contactId: string): Promise<boolean> {
    const bot = findBotById(botId);
    if (!bot) return false;
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/closeChat', bot, {
            method: 'POST',
            body: JSON.stringify({ contact_id: contactId }),
        });
        return response.success === true;
    } catch (error) {
        console.error(`Failed to close chat for contact ${contactId}:`, error);
        return false;
    }
}

export async function openChat(botId: string, contactId: string): Promise<boolean> {
    const bot = findBotById(botId);
    if (!bot) return false;
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/openChat', bot, {
            method: 'POST',
            body: JSON.stringify({ contact_id: contactId }),
        });
        return response.success === true;
    } catch (error) {
        console.error(`Failed to open chat for contact ${contactId}:`, error);
        return false;
    }
}

type SendMessagePayload =
    | { type: 'text'; text: string }
    | { type: 'image'; link: string; caption?: string; }
    | { type: 'document'; link: string; caption?: string; filename?: string; };

interface SendMessageSuccessResponse {
    success: true;
    data: {
        message_id: string;
    }
}
interface SendMessageErrorResponse {
    success: false;
    error?: string;
}
type SendMessageApiResponse = SendMessageSuccessResponse | SendMessageErrorResponse;


export async function sendMessage(
    botId: string,
    contactId: string,
    message: SendMessagePayload
): Promise<SendMessageApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };

    let messageData;

    switch (message.type) {
        case 'text':
            messageData = { type: 'text', text: { body: message.text } };
            break;
        case 'image':
            messageData = { type: 'image', image: { link: message.link, caption: message.caption } };
            break;
        case 'document':
            messageData = { type: 'document', document: { link: message.link, caption: message.caption, filename: message.filename } };
            break;
    }

    const payload = {
        contact_id: contactId,
        message: messageData
    };

    try {
        const response = await fetchFromSendPulse(`/whatsapp/contacts/send`, bot, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return response;
    } catch (error) {
        const errorMessage = (error as Error).message || "Unknown error during send.";
        return { success: false, error: errorMessage };
    }
}

export async function sendTemplateMessage(
    botId: string,
    contactId: string,
    template: WhatsAppTemplate
): Promise<SendMessageApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };

    const payload = {
        contact_id: contactId,
        template: {
            name: template.name,
            language: {
                code: template.language,
            },
            components: template.components.filter(c => c.type !== 'BODY' && c.type !== 'FOOTER'), // Body and footer are not sent
        },
    };

    try {
        const response = await fetchFromSendPulse(`/whatsapp/contacts/sendTemplate`, bot, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response.success && response.data && response.data.message_id) {
            return {
                success: true,
                data: {
                    message_id: response.data.message_id
                }
            };
        }
        return response;
    } catch (error) {
        const errorMessage = (error as Error).message || "Unknown error during template send.";
        return { success: false, error: errorMessage };
    }
}


export async function getWhatsappTemplates(botId: string): Promise<WhatsAppTemplate[]> {
    const bot = findBotById(botId);
    if (!bot) return [];

    try {
        const response = await fetchFromSendPulse(`/whatsapp/templates?bot_id=${bot.botId}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error("Failed to get templates or invalid data format:", response);
            return [];
        }

        return response.data.filter((template: any) => template.status === "APPROVED");

    } catch (error) {
        console.error("Error in getWhatsappTemplates:", error);
        return [];
    }
}

export async function getWhatsappBotVariables(botId: string): Promise<SendPulseBotVariable[]> {
    const bot = findBotById(botId);
    if (!bot) return [];

    try {
        const response = await fetchFromSendPulse(`/whatsapp/variables?bot_id=${bot.botId}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error("Failed to get bot variables or invalid data format:", response);
            return [];
        }
        return response.data;
    } catch (error) {
        console.error("Error in getWhatsappBotVariables:", error);
        return [];
    }
}


export async function getWhatsappFlows(botId: string): Promise<SendPulseFlow[]> {
    const bot = findBotById(botId);
    if (!bot) return [];

    try {
        const response = await fetchFromSendPulse(`/whatsapp/flows?bot_id=${bot.botId}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error("Failed to get flows or invalid data format:", response);
            return [];
        }
        return response.data;
    } catch (error) {
        console.error("Error in getWhatsappFlows:", error);
        return [];
    }
}

export async function getWhatsappTags(botId: string): Promise<SendPulseTag[]> {
    const bot = findBotById(botId);
    if (!bot) return [];

    try {
        const response = await fetchFromSendPulse(`/whatsapp/tags?bot_id=${bot.botId}`, bot);
        if (!response.success || !Array.isArray(response.data)) {
            console.error("Failed to get tags or invalid data format:", response);
            return [];
        }
        return response.data;
    } catch (error) {
        console.error("Error in getWhatsappTags:", error);
        return [];
    }
}


export async function getContactDetails(botId: string, contactId: string): Promise<SendPulseContact | null> {
    const bot = findBotById(botId);
    if (!bot || !contactId) return null;
    try {
        const response: SendPulseContactAPIResponse = await fetchFromSendPulse(`/whatsapp/contacts/get?contact_id=${contactId}`, bot);
        if (response.success && response.data) {
            return response.data;
        }
        console.error(`Failed to get contact details for ${contactId}:`, response.error);
        return null;
    } catch (error) {
        console.error(`Error fetching contact details for ${contactId}:`, error);
        return null;
    }
}

export async function getContactByPhone(botId: string, phone: string): Promise<SendPulseContactAPIResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse(`/whatsapp/contacts/getByPhone?phone=${encodeURIComponent(phone)}&bot_id=${bot.botId}`, bot);
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error searching by phone." };
    }
}

export async function getContactById(botId: string, id: string): Promise<SendPulseContactAPIResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse(`/whatsapp/contacts/get?contact_id=${id}`, bot);
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error searching by ID." };
    }
}

export async function addContact(botId: string, name: string, phone: string): Promise<AddContactApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };

    try {
        const response = await fetchFromSendPulse(`/whatsapp/contacts`, bot, {
            method: 'POST',
            body: JSON.stringify({
                bot_id: bot.botId,
                name: name,
                phone: phone,
                tags: [],
                variables: [],
            }),
        });
        return response;
    } catch (error) {
        const errorMessage = (error as Error).message || "Unknown error on add contact.";
        return { success: false, error: errorMessage };
    }
}

export async function deleteContactFromSendPulse(botId: string, contactId: string): Promise<boolean> {
    const bot = findBotById(botId);
    if (!bot) return false;
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/delete', bot, {
            method: 'POST',
            body: JSON.stringify({ contact_id: contactId }),
        });
        return response.success === true;
    } catch (error) {
        console.error(`Failed to delete contact ${contactId}:`, error);
        return false;
    }
}

interface ApiResponse {
    success: boolean;
    error?: string;
}

export async function setContactTag(botId: string, contactId: string, tagName: string): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/setTag', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                tags: [tagName],
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error setting tag." };
    }
}

export async function removeContactTag(botId: string, contactId: string, tagName: string): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/deleteTag', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                tag: tagName,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error removing tag." };
    }
}

export async function setContactVariables(botId: string, contactId: string, variables: VariablePayload[]): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    if (variables.length === 0) {
        return { success: true };
    }
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/setVariable', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                variables: variables,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error setting variables." };
    }
}

export async function deleteContactVariable(botId: string, contactId: string, variableName: string): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/deleteVariable', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                variable_name: variableName,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error deleting variable." };
    }
}

export async function setPauseAutomation(
    botId: string,
    contactId: string,
    minutes: number
): Promise<ApiResponse & { data?: string }> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/setPauseAutomation', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                minutes: minutes,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error setting pause." };
    }
}

export async function deletePauseAutomation(
    botId: string,
    contactId: string
): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/deletePauseAutomation', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error resuming AutoFlow." };
    }
}

export async function assignContactToOperator(botId: string, contactId: string, operatorId: string | null): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };

    let endpoint: string;
    let payload: object;

    if (operatorId !== null) {
        const numericOperatorId = parseInt(operatorId, 10);
        if (isNaN(numericOperatorId)) {
            return { success: false, error: "Invalid operator ID format." };
        }
        endpoint = '/whatsapp/contacts/operators/assign';
        payload = {
            contact_id: contactId,
            operator_id: numericOperatorId,
        };
    } else {
        endpoint = '/whatsapp/contacts/operators/unAssign';
        payload = {
            contact_id: contactId,
        };
    }

    try {
        const response = await fetchFromSendPulse(endpoint, bot, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error assigning/unassigning operator." };
    }
}


export async function addContactNote(botId: string, contactId: string, noteText: string): Promise<ApiResponse & { data?: Message }> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const apiResponse = await fetchFromSendPulse('/whatsapp/contacts/createNote', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                bot_id: bot.botId,
                text: noteText,
            }),
        });

        if (apiResponse.success && apiResponse.data) {
            const noteData = apiResponse.data;
            const message: Message = {
                id: noteData._id,
                type: 'operator_note',
                sender: agent, // Notes are always from an agent
                text: noteData.text,
                timestamp: noteData.created_at,
                sentBy: noteData.sent_by ? {
                    id: noteData.sent_by.id,
                    email: noteData.sent_by.email,
                    firstname: noteData.sent_by.firstname,
                } : undefined,
                status: noteData.status,
            };
            return { success: true, data: message };
        }
        return apiResponse;

    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error adding note." };
    }
}

export async function deleteContactNote(botId: string, contactId: string, noteId: string): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/deleteNote', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                bot_id: bot.botId,
                note_id: noteId,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error deleting note." };
    }
}

export async function updateContactNote(botId: string, contactId: string, noteId: string, text: string): Promise<ApiResponse> {
    const bot = findBotById(botId);
    if (!bot) return { success: false, error: "Bot configuration not found." };
    try {
        const response = await fetchFromSendPulse('/whatsapp/contacts/updateNote', bot, {
            method: 'POST',
            body: JSON.stringify({
                contact_id: contactId,
                bot_id: bot.botId,
                note_id: noteId,
                text: text,
            }),
        });
        return response;
    } catch (error) {
        return { success: false, error: (error as Error).message || "Unknown error updating note." };
    }
}
