import { getAccessToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function resolveApiBase() {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const host = url.hostname;
    const protocol = url.protocol;
    return `${protocol}//${host}:18100`;
  }
  return "";
}

export function resolveAdminBase() {
  const base = resolveApiBase();
  if (base) return base;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const host = url.hostname;
    const protocol = url.protocol;
    return `${protocol}//${host}:18100`;
  }
  return "";
}

async function parseJsonSafe(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = resolveApiBase();
  const method = (options.method || "GET").toUpperCase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    cache: options.cache || (method === "GET" ? "no-store" : undefined)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return (await parseJsonSafe(res)) as T;
}

export async function apiUpload<T>(path: string, data: FormData): Promise<T> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const base = resolveApiBase();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    body: data,
    headers
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await parseJsonSafe(res)) as T;
}

export async function login(username: string, password: string) {
  return apiFetch<{ access: string; refresh: string }>("/api/auth/token/", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function me() {
  return apiFetch<{ authenticated: boolean; id?: number; username?: string; email?: string; is_staff?: boolean; is_superuser?: boolean }>(
    "/api/auth/me/"
  );
}

export async function changePassword(old_password: string, new_password: string) {
  return apiFetch<{ status: string }>("/api/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password, new_password })
  });
}

export async function getSettings() {
  return apiFetch<{
    id: number;
    working_year: number;
    reference_year: number;
    mail_brand_name?: string | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_user?: string | null;
    smtp_use_tls?: boolean;
    smtp_use_ssl?: boolean;
    smtp_from_email?: string | null;
    smtp_configured?: boolean;
  }>("/api/settings/");
}

export async function updateSettings(data: {
  working_year?: number;
  reference_year?: number;
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_user?: string | null;
  mail_brand_name?: string | null;
  smtp_password?: string;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
  smtp_from_email?: string | null;
}) {
  return apiFetch<{
    id: number;
    working_year: number;
    reference_year: number;
    mail_brand_name?: string | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_user?: string | null;
    smtp_use_tls?: boolean;
    smtp_use_ssl?: boolean;
    smtp_from_email?: string | null;
    smtp_configured?: boolean;
  }>("/api/settings/", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function sendTestMail(to_email: string) {
  return apiFetch<{ status: string; sent_to: string[] }>("/api/settings/test_mail/", {
    method: "POST",
    body: JSON.stringify({ to_email })
  });
}

export async function sendTableMail(payload: {
  to_emails: string;
  title: string;
  subject?: string;
  note?: string;
  attachment_format?: "pdf" | "csv";
  columns: string[];
  rows: Array<string[] | Record<string, string>>;
}) {
  return apiFetch<{ status: string; sent_to: string[] }>("/api/settings/send_table_mail/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function exportTablePdf(payload: {
  title: string;
  note?: string;
  columns: string[];
  rows: Array<string[] | Record<string, string>>;
}) {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const base = resolveApiBase();
  const res = await fetch(`${base}/api/settings/export_table_pdf/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.blob();
}

export async function updateCounter(data: {
  kind: "report_global" | "report_year" | "document";
  year?: number;
  doc_type?: string;
  last_serial: number;
}) {
  return apiFetch<{ status: string }>("/api/admin-counters/", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getYearLocks() {
  return apiFetch<Array<{ id: number; year: number; is_locked: boolean; locked_at?: string | null }>>(
    "/api/year-locks/"
  );
}

export async function setYearLock(year: number, is_locked: boolean) {
  return apiFetch<{ id: number; year: number; is_locked: boolean }>("/api/year-locks/", {
    method: "POST",
    body: JSON.stringify({ year, is_locked })
  });
}

export type ChatUser = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_online?: boolean;
  last_seen_at?: string | null;
};

export type ChatParticipant = {
  id: number;
  user: ChatUser;
  joined_at: string;
  last_read_at?: string | null;
};

export type ChatMessageFile = {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  signed_url?: string;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  thread: number;
  sender: ChatUser;
  body: string;
  is_deleted: boolean;
  created_at: string;
  files: ChatMessageFile[];
};

export type ChatThread = {
  id: number;
  name?: string | null;
  title: string;
  is_group: boolean;
  is_global?: boolean;
  created_by?: ChatUser | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  unread_count?: number;
  participants: ChatParticipant[];
};

export async function getChatThreads() {
  return apiFetch<ChatThread[]>("/api/chat-threads/");
}

export async function getChatUsers() {
  return apiFetch<ChatUser[]>("/api/chat-threads/users/");
}

export async function createDirectThread(userId: number) {
  return apiFetch<ChatThread>("/api/chat-threads/", {
    method: "POST",
    body: JSON.stringify({ is_group: false, user_ids: [userId] })
  });
}

export async function createGroupThread(name: string, userIds: number[]) {
  return apiFetch<ChatThread>("/api/chat-threads/", {
    method: "POST",
    body: JSON.stringify({ is_group: true, name, user_ids: userIds })
  });
}

export async function getChatMessages(threadId: number) {
  return apiFetch<ChatMessage[]>(`/api/chat-messages/?thread=${threadId}`);
}

export async function sendChatMessage(params: {
  threadId: number;
  body?: string;
  files?: File[];
}) {
  const data = new FormData();
  data.append("thread", String(params.threadId));
  if (params.body) data.append("body", params.body);
  for (const f of params.files || []) {
    data.append("files", f);
  }
  return apiUpload<ChatMessage>("/api/chat-messages/", data);
}

export async function readChatThread(threadId: number) {
  return apiFetch<{ status: string }>(`/api/chat-threads/${threadId}/read/`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getChatUnreadCount() {
  return apiFetch<{ unread_count: number }>("/api/chat-threads/unread_count/");
}

export async function leaveChatThread(threadId: number) {
  return apiFetch<{ status: string }>(`/api/chat-threads/${threadId}/leave/`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
