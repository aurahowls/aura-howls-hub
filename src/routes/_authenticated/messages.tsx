import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, ImagePlus, CheckCheck, Check, Loader2, X, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchConversations,
  fetchMessages,
  getOrCreateConversation,
  hydrateMessage,
  markConversationRead,
  sendMessage,
  type ConversationRow,
  type MessageRow,
} from "@/lib/messages";
import { searchProfiles } from "@/lib/profiles";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function MessagesPage() {
  const { profile, user } = useCurrentUser();
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerLastRead, setPartnerLastRead] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  const activeConvo = useMemo(() => convos.find((c) => c.id === activeId) ?? null, [convos, activeId]);

  const myAvatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(profile?.username ?? "wolf")}`;

  // Initial load + realtime conversation list
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchConversations(user.id).then((d) => {
      if (cancelled) return;
      setConvos(d);
      if (!activeId && d.length) setActiveId(d[0].id);
    });
    const channel = supabase
      .channel(`convos-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations(user.id).then((d) => !cancelled && setConvos(d));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations(user.id).then((d) => !cancelled && setConvos(d));
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Per-conversation messages + realtime + typing channel
  useEffect(() => {
    if (!user || !activeId) return;
    let cancelled = false;
    setMessages([]);
    setPartnerTyping(false);
    setPartnerLastRead(null);

    fetchMessages(activeId).then((m) => {
      if (!cancelled) setMessages(m);
    });
    markConversationRead(activeId, user.id);

    // partner's last read receipt
    supabase
      .from("message_reads")
      .select("user_id, last_read_at")
      .eq("conversation_id", activeId)
      .neq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPartnerLastRead(data.last_read_at as string);
      });

    const dbChannel = supabase
      .channel(`msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        async (payload) => {
          const m = await hydrateMessage(payload.new as MessageRow);
          if (cancelled) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== user.id) markConversationRead(activeId, user.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string } | null;
          if (row && row.user_id !== user.id) setPartnerLastRead(row.last_read_at);
        },
      )
      .subscribe();

    const typingChannel = supabase.channel(`typing-${activeId}`, {
      config: { broadcast: { self: false } },
    });
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId: who } = (payload.payload as { userId: string }) ?? {};
        if (who && who !== user.id) {
          setPartnerTyping(true);
          if (typingTimer) clearTimeout(typingTimer);
          typingTimer = setTimeout(() => setPartnerTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      cancelled = true;
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, [activeId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, partnerTyping]);

  function handleTyping(value: string) {
    setDraft(value);
    const now = Date.now();
    if (now - lastTypingSent.current > 1500 && typingChannelRef.current && user) {
      lastTypingSent.current = now;
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id },
      });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeId || sending) return;
    if (!draft.trim() && !file) return;
    setSending(true);
    try {
      if (file && file.size > 100 * 1024 * 1024) throw new Error("Max file size 100 MB");
      await sendMessage({ conversationId: activeId, senderId: user.id, content: draft, file });
      setDraft("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === user?.id);
  const seenByPartner =
    lastMine && partnerLastRead && new Date(partnerLastRead) >= new Date(lastMine.created_at);

  return (
    <AppShell rightRail={false}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Pack DMs</h1>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
        >
          + New DM
        </button>
      </div>
      <div className="glass-card grid h-[70vh] overflow-hidden rounded-3xl md:grid-cols-[280px_1fr]">
        <div className="overflow-y-auto border-b border-border md:border-b-0 md:border-r">
          {convos.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No conversations yet. Start one with a fellow wolf.</p>
          )}
          {convos.map((c) => {
            const name = c.partner?.display_name ?? c.partner?.username ?? "Wolf";
            const handle = c.partner?.username ?? "wolf";
            const avatar =
              c.partner?.avatar_url ??
              `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40",
                  activeId === c.id && "bg-muted/60",
                )}
              >
                <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relative(c.last_message_at)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.last_message_preview ?? "New conversation"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground animate-howl-pulse">
                    {c.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col">
          {activeConvo ? (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <img
                  src={
                    activeConvo.partner?.avatar_url ??
                    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(activeConvo.partner?.username ?? "wolf")}`
                  }
                  alt=""
                  className="h-10 w-10 rounded-full ring-1 ring-border"
                />
                <div>
                  <p className="font-semibold">
                    {activeConvo.partner?.display_name ?? activeConvo.partner?.username ?? "Wolf"}
                  </p>
                  <p className="text-xs text-muted-foreground">@{activeConvo.partner?.username ?? "wolf"}</p>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        )}
                      >
                        {m.media_url && m.media_type === "image" && (
                          <img src={m.media_url} alt="" className="mb-1 max-h-72 rounded-lg" />
                        )}
                        {m.media_url && m.media_type === "video" && (
                          <video src={m.media_url} controls className="mb-1 max-h-72 rounded-lg" />
                        )}
                        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">{relative(m.created_at)}</span>
                    </div>
                  );
                })}
                {partnerTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                    </span>
                    typing…
                  </div>
                )}
                {lastMine && (
                  <div className="flex justify-end text-[10px] text-muted-foreground">
                    {seenByPartner ? (
                      <span className="flex items-center gap-1 text-primary">
                        <CheckCheck className="h-3 w-3" /> Seen
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Sent
                      </span>
                    )}
                  </div>
                )}
              </div>
              <form onSubmit={handleSend} className="border-t border-border p-3">
                {file && (
                  <div className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs">
                    <span className="truncate">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <img src={myAvatar} alt="" className="h-8 w-8 rounded-full" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-primary"
                    aria-label="Attach media"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <input
                    value={draft}
                    onChange={(e) => handleTyping(e.target.value)}
                    maxLength={1000}
                    placeholder="Send a howl…"
                    className="flex-1 rounded-full border border-border bg-card/60 px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={sending || (!draft.trim() && !file)}
                    className="btn-gold grid h-10 w-10 place-items-center rounded-full disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Select a conversation to start howling.
            </div>
          )}
        </div>
      </div>

      {showNew && user && (
        <NewDmDialog
          meId={user.id}
          onClose={() => setShowNew(false)}
          onPick={async (otherId) => {
            const id = await getOrCreateConversation(user.id, otherId);
            setShowNew(false);
            const fresh = await fetchConversations(user.id);
            setConvos(fresh);
            setActiveId(id);
          }}
        />
      )}
    </AppShell>
  );
}

function NewDmDialog({
  meId,
  onClose,
  onPick,
}: {
  meId: string;
  onClose: () => void;
  onPick: (otherId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>>([]);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const data = await searchProfiles(q.trim());
      if (!cancel) setResults(data.filter((p) => p.id !== meId));
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q, meId]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-md rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">New Pack DM</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wolves…"
            className="w-full rounded-full border border-border bg-card/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-3 max-h-72 overflow-y-auto">
          {results.map((p) => {
            const name = p.display_name ?? p.username ?? "Wolf";
            const avatar =
              p.avatar_url ??
              `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.username ?? "wolf")}`;
            return (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-muted/50"
              >
                <img src={avatar} alt="" className="h-9 w-9 rounded-full ring-1 ring-border" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                </div>
              </button>
            );
          })}
          {q && results.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">No wolves found.</p>
          )}
        </div>
      </div>
    </div>
  );
}