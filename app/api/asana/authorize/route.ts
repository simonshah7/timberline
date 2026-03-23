import { NextResponse } from 'next/server';
import { db } from '@/db';
import { adminSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const settings = await db.select().from(adminSettings);
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const clientId = map.asana_client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Asana Client ID not configured. Please save your Client ID in Settings first.' },
        { status: 400 }
      );
    }

    // Build redirect URI from request headers
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/asana/callback`;

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in admin settings
    const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, 'asana_oauth_state'));
    if (existing.length > 0) {
      await db.update(adminSettings).set({ value: state, updatedAt: new Date() }).where(eq(adminSettings.key, 'asana_oauth_state'));
    } else {
      await db.insert(adminSettings).values({ key: 'asana_oauth_state', value: state });
    }

    const authUrl = new URL('https://app.asana.com/-/oauth_authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating Asana OAuth', error);
    return NextResponse.json({ error: 'Failed to initiate Asana OAuth' }, { status: 500 });
  }
}
