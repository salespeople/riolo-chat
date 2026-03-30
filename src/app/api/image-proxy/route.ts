import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.SENDPULSE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SENDPULSE_CLIENT_SECRET || '';

// Token locale cache per image-proxy
let proxyTokenCache: { token: string; expires: number } | null = null;

async function getToken(): Promise<string | null> {
    if (proxyTokenCache && proxyTokenCache.expires > Date.now()) return proxyTokenCache.token;

    try {
        const res = await fetch('https://api.sendpulse.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const data = await res.json();
        proxyTokenCache = {
            token: data.access_token,
            expires: Date.now() + data.expires_in * 1000,
        };
        return data.access_token;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const token = await getToken();
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
