import { NextResponse } from 'next/server';
import { db } from '@/db';
import { adminSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

async function upsertSetting(key: string, value: string) {
  const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
  if (existing.length > 0) {
    await db.update(adminSettings).set({ value, updatedAt: new Date() }).where(eq(adminSettings.key, key));
  } else {
    await db.insert(adminSettings).values({ key, value });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle user denying access
    if (error) {
      logger.error('Asana OAuth error', { error });
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      return NextResponse.redirect(`${protocol}://${host}/?asana=error`);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    // Verify state for CSRF protection
    const settings = await db.select().from(adminSettings);
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    if (map.asana_oauth_state !== state) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 403 });
    }

    const clientId = map.asana_client_id;
    const clientSecret = map.asana_client_secret;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Asana credentials not configured' }, { status: 400 });
    }

    // Build redirect URI (must match the one used in authorize)
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/asana/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error('Asana token exchange failed', { status: tokenResponse.status, body: errorData });
      return NextResponse.redirect(`${protocol}://${host}/?asana=error`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || '';

    // Fetch user info
    let userName = 'Asana User';
    try {
      const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userName = userData.data?.name || 'Asana User';
      }
    } catch (userError) {
      logger.error('Failed to fetch Asana user info', userError);
    }

    // Store tokens and user name
    await Promise.all([
      upsertSetting('asana_access_token', accessToken),
      upsertSetting('asana_refresh_token', refreshToken),
      upsertSetting('asana_user_name', userName),
      upsertSetting('asana_oauth_state', ''), // Clear state
    ]);

    return NextResponse.redirect(`${protocol}://${host}/?asana=connected`);
  } catch (error) {
    logger.error('Error handling Asana OAuth callback', error);
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    return NextResponse.redirect(`${protocol}://${host}/?asana=error`);
  }
}
