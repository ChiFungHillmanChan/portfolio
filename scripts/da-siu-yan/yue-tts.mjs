// Dev-time only. Cantonese TTS via Google Cloud Text-to-Speech.
//
// Why this exists: Gemini TTS (used by scripts/generate-granny-voice.mjs) does
// not list Cantonese as a supported output language and detects the input
// language automatically, so it has no Cantonese pronunciation dictionary and
// guesses — producing tone errors (無 mou4 -> mou3), wrong polyphone readings
// (抖 tau2 -> dau2) and rimes that collapse toward Mandarin (腮 soi1 -> sai).
// Cloud TTS has yue-HK as a first-class language with 30 Chirp3-HD voices,
// including Gacrux — the same voice name already used for the granny.
//
// Auth: the Firebase Admin service-account JSON already in the repo root
// (gitignored via *-firebase-adminsdk-*.json). Its project_id is
// system-design-c84d3, which is where the Cloud TTS API is enabled. We mint a
// self-signed JWT and exchange it for an access token — no extra npm deps, and
// nothing mutates the local gcloud config. Override the credentials file with
// GOOGLE_APPLICATION_CREDENTIALS.
//
// Never logs the private key or the access token.
import { readFileSync, readdirSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
export const LANGUAGE_CODE = 'yue-HK';
export const VOICE_NAME = 'yue-HK-Chirp3-HD-Gacrux';

function credentialsPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hit = readdirSync(REPO).find((f) => /-firebase-adminsdk-.*\.json$/.test(f));
  if (!hit) {
    throw new Error(
      'No service-account JSON found in the repo root (*-firebase-adminsdk-*.json). ' +
      'Set GOOGLE_APPLICATION_CREDENTIALS to point at one.'
    );
  }
  return join(REPO, hit);
}

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cached = null; // { token, expiresAt }

export async function accessToken() {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;

  const sa = JSON.parse(readFileSync(credentialsPath(), 'utf8'));
  for (const field of ['client_email', 'private_key', 'token_uri', 'project_id']) {
    if (!sa[field]) throw new Error(`Service account JSON is missing "${field}"`);
  }

  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE, aud: sa.token_uri, iat, exp: iat + 3600
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt
    })
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${body.slice(0, 300)}`);
  const data = JSON.parse(body);
  if (!data.access_token) throw new Error('token exchange returned no access_token');
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}

export async function projectId() {
  return JSON.parse(readFileSync(credentialsPath(), 'utf8')).project_id;
}

async function call(path, init = {}) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': await projectId(),
      ...(init.headers ?? {})
    }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const msg = json?.error?.message ?? text.slice(0, 400);
    const err = new Error(`Cloud TTS ${res.status} on ${path}: ${msg}`);
    err.status = res.status;
    err.reason = json?.error?.status;
    throw err;
  }
  return json;
}

export async function listVoices(languageCode = LANGUAGE_CODE) {
  const { voices = [] } = await call(`voices?languageCode=${encodeURIComponent(languageCode)}`);
  return voices;
}

/**
 * Synthesize one line. Returns a Buffer of MP3 bytes.
 * Chirp3-HD voices reject SSML and most audioConfig prosody fields, so the
 * knobs here are deliberately minimal — shape the timbre with ffmpeg instead.
 */
export async function synthesize(text, {
  voiceName = VOICE_NAME, languageCode = LANGUAGE_CODE,
  sampleRateHertz = 24000, speakingRate, audioEncoding = 'MP3'
} = {}) {
  const audioConfig = { audioEncoding, sampleRateHertz };
  if (speakingRate !== undefined) audioConfig.speakingRate = speakingRate;
  const data = await call('text:synthesize', {
    method: 'POST',
    body: JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig
    })
  });
  if (!data.audioContent) throw new Error('response had no audioContent');
  return Buffer.from(data.audioContent, 'base64');
}
