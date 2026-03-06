/**
 * Gmail API client for email automation.
 * Requires OAuth tokens (from email_accounts) or env GOOGLE_ACCESS_TOKEN for dev.
 */

import { google } from "googleapis";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

export interface GmailClientConfig {
  accessToken: string;
  refreshToken?: string;
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/email/oauth/callback"
  );
}

export function createGmailClient(config: GmailClientConfig) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
  });
  return google.gmail({ version: "v1", auth: oauth2 });
}

export async function listMessages(
  config: GmailClientConfig,
  options?: { maxResults?: number; labelIds?: string[]; q?: string }
): Promise<GmailMessage[]> {
  const gmail = createGmailClient(config);
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options?.maxResults ?? 20,
    labelIds: options?.labelIds,
    q: options?.q,
  });

  const messages = res.data.messages ?? [];
  const results: GmailMessage[] = [];

  for (const m of messages) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    });
    const headers = full.data.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
    results.push({
      id: m.id,
      threadId: m.threadId ?? "",
      subject: get("Subject"),
      from: get("From"),
      to: get("To"),
      date: get("Date"),
      snippet: full.data.snippet ?? "",
      labelIds: full.data.labelIds ?? [],
    });
  }

  return results;
}

export async function moveMessage(
  config: GmailClientConfig,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<void> {
  const gmail = createGmailClient(config);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds, removeLabelIds },
  });
}

export async function trashMessage(config: GmailClientConfig, messageId: string): Promise<void> {
  const gmail = createGmailClient(config);
  await gmail.users.messages.trash({ userId: "me", id: messageId });
}

export async function deleteMessage(config: GmailClientConfig, messageId: string): Promise<void> {
  const gmail = createGmailClient(config);
  await gmail.users.messages.delete({ userId: "me", id: messageId });
}

export async function archiveMessage(config: GmailClientConfig, messageId: string): Promise<void> {
  // Archive = remove INBOX
  await moveMessage(config, messageId, [], ["INBOX"]);
}
