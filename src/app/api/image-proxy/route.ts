import { NextRequest, NextResponse } from 'next/server';
import { getBotByBotId } from '@/config/app.config';

// Cache dei token in memoria (stessa logica di sendpulse.ts)
const tokenCache: Map<string, { token: string; expires: number }> = new Map();

async function getToken(clientId: string, clientSecret: string): Promise<string | null> {
    const cached = tokenCache.get(clientId);
    if (cached && cached.expires > Date.now()) return cached.token;

    try {
        const res = await fetch('https://api.sendpulse.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }),
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const data = await res.json();
        tokenCache.set(clientId, {
            token: data.access_token,
            expires: Date.now() + data.expires_in * 1000,
        });
        return data.access_token;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    const botId = request.nextUrl.searchParams.get('botId');

    if (!url || !botId) {
        return NextResponse.json({ error: 'Missing url or botId' }, { status: 400 });
    }

    const bot = getBotByBotId(botId);
    if (!bot) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const token = await getToken(bot.clientId, bot.clientSecret);
    if (!token) {
        return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    try {
        const imageResponse = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store',
        });

        if (!imageResponse.ok) {
            return NextResponse.json(
                { error: `Image fetch failed: ${imageResponse.status}` },
                { status: imageResponse.status }
            );
        }

        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const imageBuffer = await imageResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}
