"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
    Bot,
    ChevronDown,
    ChevronRight,
    History,
    Loader2,
    MessageSquare,
    PlusCircle,
    SendHorizontal,
    Sparkles,
    UserCircle2,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const SESSION_STORAGE_KEY = "finvision:finpilot:session-id";
const HISTORY_STORAGE_KEY = "finvision:finpilot:history";

const SUGGESTIONS = [
    "Top 5 doanh nghiep co ROE cao nhat trong 4 quy gan day",
    "So sanh bien loi nhuan rong cua FPT va CMG",
    "Tong quan doanh thu va loi nhuan cua VNM",
    "Nhung chi so can theo doi de danh gia suc khoe tai chinh ngan hang",
];

interface ChatRequest {
    session_id?: string;
    message: string;
    mode?: "auto";
    context?: Record<string, unknown>;
}

interface DataTable {
    title: string;
    rows: Array<Record<string, unknown>>;
}

interface ChatResponse {
    mode_used: string;
    action_required?: string | null;
    answer: string;
    thought_process?: string | null;
    data_tables: DataTable[];
    citations: Array<Record<string, unknown>>;
    sql_used: string[];
    confidence: number | null;
    data_freshness: string | null;
    trace_id: string | null;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    pending?: boolean;
    error?: boolean;
    meta?: ChatResponse;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

function toText(value: unknown): string {
    if (value == null) {
        return "-";
    }
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function getOrCreateSessionId(): string {
    if (typeof window === "undefined") {
        return "server";
    }

    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const generated = `chat-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
}

function CollapsibleSection({
    title,
    defaultOpen = false,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/60">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/40"
            >
                <span>{title}</span>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {open && <div className="border-t border-border/70 p-3">{children}</div>}
        </div>
    );
}

export default function FinPilotPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState("");

    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const historyRaw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
            const loadedSessions: ChatSession[] = historyRaw ? JSON.parse(historyRaw) : [];
            setSessions(loadedSessions);

            const activeId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (activeId) {
                setCurrentSessionId(activeId);
                const activeSession = loadedSessions.find((s) => s.id === activeId);
                if (activeSession) {
                    setMessages(activeSession.messages);
                }
            } else {
                const newId = `chat-${crypto.randomUUID()}`;
                window.sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
                setCurrentSessionId(newId);
            }
        } catch (error) {
            console.error("Failed to load FinPilot history", error);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !currentSessionId) {
            return;
        }

        setSessions((prev) => {
            const now = Date.now();
            const firstUserMessage = messages.find((m) => m.role === "user");
            const title = firstUserMessage ? `${firstUserMessage.content.slice(0, 42)}...` : "New Chat";
            const next = [...prev];
            const idx = next.findIndex((s) => s.id === currentSessionId);

            if (messages.length === 0) {
                if (idx >= 0) {
                    next[idx] = {
                        ...next[idx],
                        messages: [],
                        updatedAt: now,
                    };
                }
                window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
                return next;
            }

            if (idx >= 0) {
                next[idx] = {
                    ...next[idx],
                    title,
                    messages,
                    updatedAt: now,
                };
            } else {
                next.unshift({
                    id: currentSessionId,
                    title,
                    messages,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            const pruned = next.slice(0, 30);
            window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pruned));
            return pruned;
        });
    }, [messages, currentSessionId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const latestAssistant = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.role === "assistant" && msg.meta) {
                return msg.meta;
            }
        }
        return null;
    }, [messages]);

    const canSubmit = question.trim().length > 1 && !isSubmitting;

    const createNewChat = () => {
        const newId = `chat-${crypto.randomUUID()}`;
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
        setCurrentSessionId(newId);
        setMessages([]);
        setIsHistoryOpen(false);
    };

    const loadSession = (sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) {
            return;
        }

        window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        setCurrentSessionId(sessionId);
        setMessages(session.messages);
        setIsHistoryOpen(false);
    };

    const askQuestion = async (value: string, forceMode?: "auto" | "search" | "analysis") => {
        const trimmed = value.trim();
        if (trimmed.length < 2 || isSubmitting) {
            return;
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: trimmed,
        };

        const pendingId = crypto.randomUUID();
        const pendingMsg: Message = {
            id: pendingId,
            role: "assistant",
            content: "Dang xu ly...",
            pending: true,
        };

        setMessages((prev) => [...prev, userMsg, pendingMsg]);
        setQuestion("");
        setIsSubmitting(true);

        try {
            const payload: ChatRequest = {
                session_id: currentSessionId || getOrCreateSessionId(),
                message: trimmed,
                mode: forceMode || "auto",
                context: {},
            };

            const response = await fetchWithAuth(`${API}/chat/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                const detail = typeof data?.detail?.error === "string"
                    ? data.detail.error
                    : typeof data?.detail === "string"
                    ? data.detail
                    : "Khong the goi FinPilot";
                throw new Error(detail);
            }

            const assistantMsg: Message = {
                id: pendingId,
                role: "assistant",
                content: (data as ChatResponse).answer,
                meta: data as ChatResponse,
            };

            setMessages((prev) => prev.map((msg) => (msg.id === pendingId ? assistantMsg : msg)));
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Loi khong xac dinh";
            const assistantErr: Message = {
                id: pendingId,
                role: "assistant",
                content: errMsg,
                error: true,
            };
            setMessages((prev) => prev.map((msg) => (msg.id === pendingId ? assistantErr : msg)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await askQuestion(question);
    };

    const onInputKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            await askQuestion(question);
        }
    };

    return (
        <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#eef2ff_0%,#f8fafc_38%,#ffffff_80%)] dark:bg-[radial-gradient(ellipse_at_top,#111827_0%,#0b1220_35%,#030712_82%)]">
            <section className="mx-auto flex h-full min-w-0 max-w-5xl flex-col px-4">
                <div className="sticky top-0 z-20 border-b border-border/60 bg-background/70 py-3 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">FinPilot</p>
                                <p className="text-xs text-muted-foreground">Tra loi theo ngu canh, LLM tu quyet dinh cach xu ly</p>
                            </div>
                        </div>

                        <div className="relative flex items-center gap-2">
                            <button
                                type="button"
                                onClick={createNewChat}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                                <PlusCircle className="h-4 w-4" />
                                New chat
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsHistoryOpen((v) => !v)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                                <History className="h-4 w-4" />
                                History
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {isHistoryOpen && (
                                <div className="absolute right-0 top-11 w-[320px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl">
                                    <div className="border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                                        Chat history
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto p-2">
                                        {sessions.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                                                Chua co cuoc hoi thoai nao.
                                            </div>
                                        ) : (
                                            <ul className="space-y-1">
                                                {sessions
                                                    .slice()
                                                    .sort((a, b) => b.updatedAt - a.updatedAt)
                                                    .map((session) => {
                                                        const active = currentSessionId === session.id;
                                                        return (
                                                            <li key={session.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => loadSession(session.id)}
                                                                    className={cn(
                                                                        "w-full rounded-lg px-3 py-2 text-left transition",
                                                                        active ? "bg-foreground text-background" : "hover:bg-muted"
                                                                    )}
                                                                >
                                                                    <p className="truncate text-xs font-medium">{session.title.replace("...", "") || "New chat"}</p>
                                                                    <p className={cn("mt-1 text-[11px]", active ? "text-background/70" : "text-muted-foreground")}>
                                                                        {new Date(session.updatedAt).toLocaleDateString("vi-VN", {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                            day: "2-digit",
                                                                            month: "2-digit",
                                                                        })}
                                                                    </p>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {messages.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-8">
                        <div className="w-full max-w-3xl">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <h1 className="text-center text-3xl font-semibold leading-tight text-foreground">Ban muon phan tich dieu gi hom nay?</h1>
                            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
                                Dat cau hoi tu nhien. He thong se tu chon role va cach truy van du lieu phu hop voi y dinh cua ban.
                            </p>

                            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {SUGGESTIONS.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => askQuestion(item)}
                                        className="rounded-2xl border border-border/80 bg-card/70 p-4 text-left text-sm text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto py-7">
                        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                            {messages.map((msg) => (
                                <article key={msg.id} className="flex gap-3">
                                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/80">
                                        {msg.role === "assistant" ? (
                                            <Bot className="h-4 w-4 text-foreground" />
                                        ) : (
                                            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {msg.role === "assistant" ? "FinPilot" : "Ban"}
                                            </span>
                                            {msg.meta?.mode_used && (
                                                <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                    role: {msg.meta.mode_used}
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            className={cn(
                                                "max-w-none whitespace-pre-wrap text-[15px] leading-7",
                                                msg.role === "user" && "rounded-2xl bg-muted/75 px-4 py-3",
                                                msg.error && "rounded-xl border border-red-200 bg-red-50 p-3 text-red-700"
                                            )}
                                        >
                                            {msg.content}
                                        </div>

                                        {msg.pending && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Dang xu ly...
                                            </div>
                                        )}

                                        {msg.meta?.action_required === "confirm_analysis" && (
                                            <div className="mt-3 flex gap-3">
                                                <button
                                                    disabled={isSubmitting}
                                                    onClick={() => {
                                                        const userMsg = messages[messages.findIndex(m => m.id === msg.id) - 1];
                                                        if (userMsg) askQuestion(userMsg.content, "analysis");
                                                    }}
                                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                                >
                                                    Đồng ý phân tích sâu
                                                </button>
                                            </div>
                                        )}

                                        {msg.meta?.thought_process && (
                                            <CollapsibleSection title="Suy nghĩ của AI">
                                                <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground italic border border-muted">
                                                    {msg.meta.thought_process}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {msg.meta && (
                                            <div className="space-y-2">
                                                {msg.meta.sql_used.length > 0 && (
                                                    <CollapsibleSection title={`SQL da dung (${msg.meta.sql_used.length})`}>
                                                        <div className="space-y-3">
                                                            {msg.meta.sql_used.map((sql, idx) => (
                                                                <pre
                                                                    key={`${msg.id}-sql-${idx}`}
                                                                    className="overflow-x-auto rounded-lg bg-muted/60 p-2 text-[11px] text-muted-foreground"
                                                                >
                                                                    {sql}
                                                                </pre>
                                                            ))}
                                                        </div>
                                                    </CollapsibleSection>
                                                )}

                                                {msg.meta.data_tables.length > 0 && (
                                                    <CollapsibleSection title={`Bang du lieu (${msg.meta.data_tables.length})`}>
                                                        <div className="space-y-4">
                                                            {msg.meta.data_tables.map((table, tableIdx) => {
                                                                const columns = Object.keys(table.rows[0] ?? {});
                                                                return (
                                                                    <div key={`${msg.id}-table-${tableIdx}`} className="rounded-lg border border-border/70">
                                                                        <div className="border-b border-border/70 bg-muted/40 px-3 py-2 text-xs font-medium text-foreground">
                                                                            {table.title}
                                                                        </div>
                                                                        <div className="max-h-[240px] overflow-auto p-3">
                                                                            {table.rows.length === 0 ? (
                                                                                <p className="text-xs text-muted-foreground">Khong co du lieu.</p>
                                                                            ) : (
                                                                                <table className="min-w-full border-collapse text-xs">
                                                                                    <thead>
                                                                                        <tr>
                                                                                            {columns.map((col) => (
                                                                                                <th key={col} className="border-b border-border/60 pb-2 pr-4 text-left font-medium whitespace-nowrap">
                                                                                                    {col}
                                                                                                </th>
                                                                                            ))}
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {table.rows.slice(0, 10).map((row, rowIdx) => (
                                                                                            <tr key={`${msg.id}-${tableIdx}-${rowIdx}`}>
                                                                                                {columns.map((col) => (
                                                                                                    <td key={`${msg.id}-${tableIdx}-${rowIdx}-${col}`} className="border-b border-border/40 py-2 pr-4 align-top text-muted-foreground whitespace-nowrap">
                                                                                                        {toText(row[col])}
                                                                                                    </td>
                                                                                                ))}
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </CollapsibleSection>
                                                )}

                                                {msg.meta.citations.length > 0 && (
                                                    <CollapsibleSection title={`Nguon tham chieu (${msg.meta.citations.length})`}>
                                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                                            {msg.meta.citations.map((item, idx) => (
                                                                <li key={`${msg.id}-cite-${idx}`} className="rounded bg-muted/50 px-2 py-1">
                                                                    {toText(item)}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </CollapsibleSection>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                    {msg.meta.trace_id && <span>trace: {msg.meta.trace_id}</span>}
                                                    {msg.meta.data_freshness && <span>freshness: {msg.meta.data_freshness}</span>}
                                                    {msg.meta.confidence != null && <span>confidence: {msg.meta.confidence}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                            <div ref={endRef} className="h-2" />
                        </div>
                    </div>
                )}

                <div className="sticky bottom-0 border-t border-border/60 bg-background/85 py-4 backdrop-blur-md">
                    <div className="mx-auto w-full max-w-3xl">
                        <form onSubmit={onSubmit} className="rounded-2xl border border-border/80 bg-card/80 p-2 shadow-sm">
                            <div className="flex items-end gap-2">
                                <button
                                    type="button"
                                    onClick={createNewChat}
                                    className="hidden h-10 shrink-0 items-center justify-center rounded-xl border border-border/70 px-3 text-xs text-muted-foreground transition hover:text-foreground md:inline-flex"
                                    title="New chat"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </button>

                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={onInputKeyDown}
                                    rows={1}
                                    placeholder="Nhập câu hỏi về tài chính..."
                                    className="max-h-[180px] min-h-[44px] w-full resize-none rounded-xl bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                                />

                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                                </button>
                            </div>
                        </form>

                        <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
                            <span>LLM tu chon role theo ngu canh cau hoi.</span>
                            {latestAssistant?.mode_used ? <span>Role vua dung: {latestAssistant.mode_used}</span> : <span>AI co the sai, hay xac minh ket qua quan trong.</span>}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
