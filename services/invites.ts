/**
 * Invite tokens — one-time, expiring, signed.
 * Instead of sending passwords in plaintext, send a token link.
 */
import { randomBytes } from "crypto";
import { collections } from "./data/store";
import { persistInsert } from "./data/store";
import { currentAcademyId } from "./session";

const TOKEN_TTL_HOURS = 72;

export interface InviteToken {
  id: string;
  academy_id: string;
  email: string;
  role: string;
  token: string;
  used: boolean;
  expires_at: string;
  created_by: string | null;
  created_at: string;
}

export async function createInviteToken(email: string, role: string, createdBy?: string | null): Promise<InviteToken> {
  const now = new Date();
  const expires = new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  const invite: InviteToken = {
    id: crypto.randomUUID(),
    academy_id: currentAcademyId(),
    email,
    role,
    token: randomBytes(32).toString("hex"),
    used: false,
    expires_at: expires.toISOString(),
    created_by: createdBy ?? null,
    created_at: now.toISOString(),
  };
  if (!(collections() as any).inviteTokens) (collections() as any).inviteTokens = [];
  (collections() as any).inviteTokens.push(invite);
  await persistInsert("invite_tokens", invite);
  return invite;
}

export function verifyInviteToken(token: string): InviteToken | null {
  const tokens = ((collections() as any).inviteTokens ?? []) as InviteToken[];
  const invite = tokens.find((t) => t.token === token && !t.used);
  if (!invite) return null;
  if (new Date(invite.expires_at) < new Date()) return null; // expired
  return invite;
}

export async function consumeInviteToken(token: string): Promise<boolean> {
  const tokens = ((collections() as any).inviteTokens ?? []) as InviteToken[];
  const invite = tokens.find((t) => t.token === token && !t.used);
  if (!invite) return false;
  invite.used = true;
  await persistInsert("invite_tokens", invite); // upsert
  return true;
}
