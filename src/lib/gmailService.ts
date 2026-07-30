import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

let cachedGmailAccessToken: string | null = null;

/**
 * Sign in or authorize with Google Auth Provider requesting full Gmail scopes
 */
export async function authorizeGmail(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://mail.google.com/');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.addScope('https://www.googleapis.com/auth/gmail.compose');
  provider.addScope('https://www.googleapis.com/auth/gmail.modify');

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error("Could not acquire access token for Gmail API authorization.");
  }

  cachedGmailAccessToken = credential.accessToken;
  // Cache in sessionStorage for smooth session retention
  try {
    sessionStorage.setItem('gmail_access_token', credential.accessToken);
  } catch (e) {
    console.warn("Session storage not available", e);
  }

  return { user: result.user, accessToken: cachedGmailAccessToken };
}

export function getGmailAccessToken(): string | null {
  if (cachedGmailAccessToken) return cachedGmailAccessToken;
  try {
    const stored = sessionStorage.getItem('gmail_access_token');
    if (stored) {
      cachedGmailAccessToken = stored;
      return stored;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

export function clearGmailAccessToken(): void {
  cachedGmailAccessToken = null;
  try {
    sessionStorage.removeItem('gmail_access_token');
  } catch (e) {
    // Ignore
  }
}

/**
 * Fetch authenticated Gmail user profile
 */
export async function getGmailUserProfile(accessToken?: string): Promise<GmailUserProfile> {
  const token = accessToken || getGmailAccessToken();
  if (!token) throw new Error("Gmail access token required.");

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGmailAccessToken();
      throw new Error("Gmail session expired. Please sign in again.");
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to load Gmail profile.");
  }

  return await res.json();
}

/**
 * List messages from Gmail
 */
export async function listGmailMessages(query?: string, maxResults = 15): Promise<GmailMessageSummary[]> {
  const token = getGmailAccessToken();
  if (!token) throw new Error("Gmail access token required.");

  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGmailAccessToken();
      throw new Error("Gmail session expired. Please sign in again.");
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to list Gmail messages.");
  }

  const data = await res.json();
  const messagesList = data.messages || [];

  // Fetch full details for each message in parallel
  const details = await Promise.all(
    messagesList.map(async (item: { id: string }) => {
      try {
        return await getGmailMessageDetails(item.id, token);
      } catch (e) {
        return null;
      }
    })
  );

  return details.filter((m): m is GmailMessageSummary => m !== null);
}

/**
 * Get details for a single Gmail message
 */
export async function getGmailMessageDetails(messageId: string, tokenParam?: string): Promise<GmailMessageSummary> {
  const token = tokenParam || getGmailAccessToken();
  if (!token) throw new Error("Gmail access token required.");

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch message details.");
  }

  const data = await res.json();
  const headers: GmailMessageHeader[] = data.payload?.headers || [];

  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

  const subject = getHeader('Subject') || '(No Subject)';
  const from = getHeader('From') || 'Unknown Sender';
  const to = getHeader('To') || '';
  const date = getHeader('Date') || '';

  let bodyText = data.snippet || '';
  let bodyHtml = '';

  // Parse payload body
  if (data.payload?.body?.data) {
    bodyText = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    for (const part of data.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = decodeBase64Url(part.body.data);
      }
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    date,
    bodyText,
    bodyHtml
  };
}

/**
 * Helper to decode Base64Url
 */
function decodeBase64Url(input: string): string {
  try {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  } catch (e) {
    return input;
  }
}

/**
 * Helper to encode RFC 2822 email to Base64Url
 */
function encodeRFC2822(to: string, subject: string, body: string): string {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ];
  const email = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via Gmail API
 */
export async function sendGmailMessage(to: string, subject: string, bodyHtml: string): Promise<{ id: string; threadId: string }> {
  const token = getGmailAccessToken();
  if (!token) throw new Error("Gmail access token required. Please sign in with Google.");

  const raw = encodeRFC2822(to, subject, bodyHtml);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to send email via Gmail.");
  }

  return await res.json();
}
