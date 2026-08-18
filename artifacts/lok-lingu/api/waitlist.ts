/**
 * Waitlist signup — Vercel Node serverless function.
 *
 * Excluded from `src/**` so it isn't part of the Vite bundle or the
 * `pnpm run typecheck` src-only glob (see tsconfig.json); Vercel compiles
 * it separately, so req/res are typed loosely on purpose rather than
 * pulling in @vercel/node as a new dependency for two parameter types.
 *
 * Two destinations, both best-effort and independently configured via env
 * vars set in the Vercel project (Settings -> Environment Variables), never
 * committed to the repo:
 *
 *   RESEND_API_KEY            - from resend.com, enables the email notice
 *   RESEND_FROM                (optional) verified sender; defaults to
 *                               Resend's sandbox address, which only
 *                               delivers to the account's own inbox until
 *                               a domain is verified
 *   WAITLIST_NOTIFY_EMAIL      where the "someone joined" email goes
 *
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  from a Google Cloud service account
 *   GOOGLE_PRIVATE_KEY             its private key (paste with literal
 *                                   \n line breaks; this file un-escapes them)
 *   GOOGLE_SHEET_ID                the spreadsheet ID from its URL, shared
 *                                   with the service account email as Editor
 *   GOOGLE_SHEET_RANGE              (optional) defaults to Sheet1!A:C
 *
 * Neither integration is required for the other to work. If NEITHER is
 * configured the endpoint returns 503 rather than silently accepting a
 * signup nowhere durable records it.
 */

interface WaitlistBody {
  email?: unknown;
  phone?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: accepts "+1 555-123-4567", "(555) 123 4567", etc.
// Just enough digits to be a real number, not a format validator.
const PHONE_DIGITS_RE = /\d/g;

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendNotifyEmail(email: string, phone: string | null): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.WAITLIST_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.RESEND_FROM || 'Lok Lingu <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'New Lok Lingu waitlist signup',
      text: `Email: ${email}\nPhone: ${phone ?? '(not provided)'}\nWhen: ${new Date().toISOString()}`,
    }),
  });
  if (!res.ok) {
    console.error('waitlist: resend failed', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

async function appendToSheet(email: string, phone: string | null): Promise<boolean> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !rawKey || !sheetId) return false;
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:C';

  // Service-account OAuth2 JWT bearer flow, done by hand with Node's
  // built-in crypto instead of the googleapis SDK — that package pulls in
  // a large dependency tree for what is otherwise a two-HTTP-call flow.
  const { createSign } = await import('node:crypto');
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64url(
    Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const signature = base64url(createSign('RSA-SHA256').update(signingInput).sign(privateKey));
  const assertion = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!tokenRes.ok) {
    console.error('waitlist: google token exchange failed', tokenRes.status, await tokenRes.text().catch(() => ''));
    return false;
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) return false;

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[new Date().toISOString(), email, phone ?? '']] }),
    },
  );
  if (!appendRes.ok) {
    console.error('waitlist: sheet append failed', appendRes.status, await appendRes.text().catch(() => ''));
    return false;
  }
  return true;
}

export default async function handler(req: { method?: string; body?: unknown }, res: {
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
}) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as WaitlistBody;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  const phoneDigits = phoneRaw.match(PHONE_DIGITS_RE)?.length ?? 0;
  if (phoneRaw && phoneDigits < 7) {
    return res.status(400).json({ error: 'invalid_phone' });
  }
  const phone = phoneRaw || null;

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.WAITLIST_NOTIFY_EMAIL);
  const sheetConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID,
  );
  if (!emailConfigured && !sheetConfigured) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const [emailOk, sheetOk] = await Promise.all([
    emailConfigured ? sendNotifyEmail(email, phone) : Promise.resolve(false),
    sheetConfigured ? appendToSheet(email, phone) : Promise.resolve(false),
  ]);

  if (!emailOk && !sheetOk) {
    return res.status(502).json({ error: 'delivery_failed' });
  }

  return res.status(200).json({ ok: true, notified: emailOk, recorded: sheetOk });
}
