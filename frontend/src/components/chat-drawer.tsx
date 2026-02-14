"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDirectThread,
  createGroupThread,
  getChatMessages,
  getChatThreads,
  getChatUnreadCount,
  getChatUsers,
  leaveChatThread,
  me,
  readChatThread,
  sendChatMessage,
  type ChatMessage,
  type ChatThread,
  type ChatUser
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatTs(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupUserIds, setGroupUserIds] = useState<number[]>([]);
  const [newDirectUserId, setNewDirectUserId] = useState<number | "">("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const onlineMap = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const u of users) m.set(u.id, Boolean(u.is_online));
    return m;
  }, [users]);

  async function loadThreads() {
    try {
      const data = await getChatThreads();
      setThreads(data);
      const activeExists = activeThreadId && data.some((t) => t.id === activeThreadId);
      if (!activeExists) {
        const globalThread = data.find((t) => t.is_global);
        setActiveThreadId(globalThread ? globalThread.id : data[0]?.id || null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mesajlar yuklenemedi.";
      setError(msg);
    }
  }

  async function loadUnread() {
    try {
      const data = await getChatUnreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch {
      // ignore
    }
  }

  async function loadUsers() {
    try {
      const data = await getChatUsers();
      setUsers(data);
    } catch {
      // ignore
    }
  }

  async function loadMessages(threadId: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await getChatMessages(threadId);
      setMessages(data);
      await readChatThread(threadId);
      await Promise.all([loadThreads(), loadUnread()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mesajlar yuklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  useEffect(() => {
    me().then((x) => {
      if (x && x.authenticated) {
        const uid = Number((x as any).id || 0);
        if (uid > 0) setCurrentUserId(uid);
      }
    });
  }, []);

  useEffect(() => {
    loadUnread();
    const timer = setInterval(() => {
      loadUnread();
      if (open) {
        loadThreads();
        loadUsers();
        if (activeThreadId) loadMessages(activeThreadId);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [open, activeThreadId]);

  useEffect(() => {
    if (!open) return;
    loadThreads();
    loadUsers();
  }, [open]);

  useEffect(() => {
    if (!open || !activeThreadId) return;
    loadMessages(activeThreadId);
  }, [open, activeThreadId]);

  async function handleCreateDirect() {
    if (!newDirectUserId) return;
    try {
      const t = await createDirectThread(Number(newDirectUserId));
      setActiveThreadId(t.id);
      setNewDirectUserId("");
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Birebir mesaj baslatilamadi.");
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || groupUserIds.length === 0) return;
    try {
      const t = await createGroupThread(newGroupName.trim(), groupUserIds);
      setActiveThreadId(t.id);
      setNewGroupName("");
      setGroupUserIds([]);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grup olusturulamadi.");
    }
  }

  async function handleSend() {
    if (!activeThreadId) return;
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await sendChatMessage({
        threadId: activeThreadId,
        body: body.trim(),
        files
      });
      setBody("");
      setFiles([]);
      await loadMessages(activeThreadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj gonderilemedi.");
    } finally {
      setSending(false);
    }
  }

  async function handleLeaveThread(threadId: number) {
    try {
      await leaveChatThread(threadId);
      const data = await getChatThreads();
      setThreads(data);
      const globalThread = data.find((t) => t.is_global);
      if (activeThreadId === threadId) {
        setActiveThreadId(globalThread ? globalThread.id : data[0]?.id || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj grubu kapatilamadi.");
    }
  }

  function otherUserId(t: ChatThread) {
    if (t.is_group || t.is_global) return null;
    const p = t.participants.find((x) => x.user.id !== currentUserId);
    return p?.user.id || null;
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="print-hide fixed bottom-5 right-5 z-40 rounded-full border border-ink/20 bg-white px-4 py-2 text-sm font-medium shadow-lg"
      >
        Mesajlar
        {unreadCount > 0 ? (
          <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-xs text-white">{unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="print-hide fixed bottom-20 right-5 z-40 flex h-[72vh] w-[92vw] max-w-5xl overflow-hidden rounded-2xl border border-ink/15 bg-white shadow-2xl">
          <div className="w-72 border-r border-ink/10 p-3">
            <div className="text-sm font-semibold">Mesajlar</div>
            <div className="mt-2 max-h-56 space-y-1 overflow-auto">
              {threads.map((t) => {
                const uid = otherUserId(t);
                const isOnline = uid ? Boolean(onlineMap.get(uid)) : false;
                return (
                  <div
                    key={t.id}
                    className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                      activeThreadId === t.id ? "bg-haze" : "hover:bg-haze/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setActiveThreadId(t.id)}>
                        <div className="truncate font-medium">
                          {!t.is_group && !t.is_global ? (
                            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                          ) : null}
                          {t.title || t.name || "Mesaj"}
                        </div>
                        <div className="text-xs text-ink/60">{formatTs(t.last_message_at || t.updated_at)}</div>
                      </button>
                      {!t.is_global ? (
                        <button
                          className="text-xs text-ink/50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveThread(t.id);
                          }}
                          title="Mesaji kapat"
                        >
                          x
                        </button>
                      ) : null}
                    </div>
                    {(t.unread_count || 0) > 0 ? (
                      <div className="mt-1 inline-flex rounded-full bg-terracotta px-2 py-0.5 text-[11px] text-white">
                        {t.unread_count}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 border-t border-ink/10 pt-3">
              <div className="text-xs font-medium text-ink/70">Birebir Baslat</div>
              <select
                className="mt-1 h-9 w-full rounded-md border border-ink/20 bg-white px-2 text-sm"
                value={newDirectUserId}
                onChange={(e) => setNewDirectUserId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Kullanici secin</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.is_online ? "● " : "○ "}
                    {u.username}
                  </option>
                ))}
              </select>
              <Button className="mt-2 w-full" size="sm" variant="outline" onClick={handleCreateDirect}>
                Ac
              </Button>
            </div>

            <div className="mt-3 border-t border-ink/10 pt-3">
              <div className="text-xs font-medium text-ink/70">Grup Mesaji Olustur</div>
              <Input
                className="mt-1"
                placeholder="Grup adi"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="mt-2 max-h-24 space-y-1 overflow-auto rounded-md border border-ink/10 p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={groupUserIds.includes(u.id)}
                      onChange={(e) =>
                        setGroupUserIds((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)
                        )
                      }
                    />
                    <span>
                      <span className={`mr-1 inline-block h-2 w-2 rounded-full ${u.is_online ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {u.username}
                    </span>
                  </label>
                ))}
              </div>
              <Button className="mt-2 w-full" size="sm" onClick={handleCreateGroup}>
                Grup Ac
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">
              {activeThread ? activeThread.title || activeThread.name || "Mesaj" : "Mesaj secin"}
            </div>

            <div className="flex-1 space-y-2 overflow-auto bg-sand/20 p-4">
              {loading ? <div className="text-sm text-ink/60">Yukleniyor...</div> : null}
              {!loading && messages.length === 0 ? <div className="text-sm text-ink/60">Henuz mesaj yok.</div> : null}
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-ink/10 bg-white p-2">
                  <div className="text-xs text-ink/60">
                    {m.sender.username} • {formatTs(m.created_at)}
                  </div>
                  {m.body ? <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div> : null}
                  {m.files.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.files.map((f) => (
                        <a
                          key={f.id}
                          className="rounded border border-ink/20 px-2 py-1 text-xs text-terracotta"
                          href={f.signed_url || f.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {f.filename}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-ink/10 p-3">
              <textarea
                className="h-20 w-full rounded-md border border-ink/20 px-3 py-2 text-sm"
                placeholder="Mesaj yazin..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="text-xs"
                />
                {files.map((f) => (
                  <span key={`${f.name}-${f.size}`} className="rounded-full border border-ink/20 px-2 py-0.5 text-xs">
                    {f.name}
                  </span>
                ))}
              </div>
              {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Kapat
                </Button>
                <Button onClick={handleSend} disabled={!activeThreadId || sending}>
                  {sending ? "Gonderiliyor..." : "Gonder"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
