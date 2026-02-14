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
  return apiFetch<{ authenticated: boolean; username?: string; email?: string; is_staff?: boolean; is_superuser?: boolean }>(
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
  smtp_password?: string;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
  smtp_from_email?: string | null;
}) {
  return apiFetch<{
    id: number;
    working_year: number;
    reference_year: number;
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
