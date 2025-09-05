// src/services/bor/borToken.js
import axios from 'axios';

let cachedToken = null; // { token: string, expiresAt: number } | null

export async function getBorToken() {
  const { BOR_AUTH_URL, BOR_CLIENT_ID, BOR_CLIENT_SECRET } = process.env;
  if (!BOR_AUTH_URL || !BOR_CLIENT_ID || !BOR_CLIENT_SECRET) {
    throw new Error('Missing BOR_AUTH_URL / BOR_CLIENT_ID / BOR_CLIENT_SECRET env vars');
  }

  // reuse if still valid (with a 10s safety buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: BOR_CLIENT_ID,
    client_secret: BOR_CLIENT_SECRET,
  });

  const { data } = await axios.post(BOR_AUTH_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10_000,
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const token = data?.access_token;
  if (!token) {
    throw new Error(`Token response missing access_token. Got: ${JSON.stringify(data)}`);
  }

  const expiresInSec = Number(data.expires_in ?? 3600);
  cachedToken = {
    token,
    expiresAt: Date.now() + expiresInSec * 1000,
  };

  return token;
}
