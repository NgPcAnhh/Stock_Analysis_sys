"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    Bot,
    Database,
    History,
    Loader2,
    MessageSquare,
    MessagesSquare,
    PlusCircle,
    SendHorizontal,
    Sparkles,
    UserCircle2,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const SESSION_STORAGE_KEY = "finvision:finagent:session-id";
const HISTORY_STORAGE_KEY = "finvision:finagent:history";

const SUGGESTIONS = [
    "Top 10 co phieu co PE thap nhat hien tai la gi?",
    "Tong gia tri giao dich cua VNINDEX 30 ngay gan day",
    "Phan tich xu huong ROE cua FPT theo quy gan nhat",
    "So sanh bien loi nhuan rong cua VNM va MSN",
];

type Intent = "lookup" | "analysis" | "chitchat";

interface DebugContext {
    source: string;
    score: number;
    snippet: string;
}

interface FinAgentResponse {
    answer: string;
    intent: Intent;
    sql: string | null;
    tables_used: string[];
    confidence: number | null;
    row_count: number;
    rows: Array<Record<string, unknown>>;
    cache_hit: boolean;
    cache_type: "exact" | "semantic" | null;
    model_used: string | null;
    debug_context: DebugContext[];
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    pending?: boolean;
    error?: boolean;
    meta?: FinAgentResponse;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
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

export default function FinAgentPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [includeDebug, setIncludeDebug] = useState(false);
    
    // History Session State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const endRef = useRef<HTMLDivElement | null>(null);

    // Initial load of history
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const historyRaw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
                const loadedSessions: ChatSession[] = historyRaw ? JSON.parse(historyRaw) : [];
                setSessions(loadedSessions);

                // Check active session
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
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    // Save active session to history when messages change
    useEffect(() => {
        if (typeof window !== "undefined" && currentSessionId && messages.length > 0) {
            setSessions((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === currentSessionId);
                const updatedSessions = [...prev];
                
                const firstUserMessage = messages.find((m) => m.role === "user");
                const newTitle = firstUserMessage ? firstUserMessage.content.slice(0, 40) + "..." : "New Chat";
                const now = Date.now();

                if (existingIndex >= 0) {
                    updatedSessions[existingIndex] = {
                        ...updatedSessions[existingIndex],
                        title: newTitle,
                        messages,
                        updatedAt: now,
                    };
                } else {
                    updatedSessions.unshift({
                        id: currentSessionId,
                        title: newTitle,
                        messages,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
                
                // Keep only top 20 sessions to prevent localStorage quota issues
                const prunedSessions = updatedSessions.slice(0, 20);
                window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(prunedSessions));
                return prunedSessions;
            });
        }
    }, [messages, currentSessionId]);

    const createNewChat = () => {
        const newId = `chat-${crypto.randomUUID()}`;
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
        setCurrentSessionId(newId);
        setMessages([]);
        setIsHistoryOpen(false);
    };

    const loadSession = (sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
            setCurrentSessionId(sessionId);
            setMessages(session.messages);
            setIsHistoryOpen(false);
        }
    };

    const deleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions((prev) => {
            const updated = prev.filter((s) => s.id !== sessionId);
            window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        if (currentSessionId === sessionId) {
            createNewChat();
        }
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const canSubmit = question.trim().length > 1 && !isSubmitting;

    const latestAssistant = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.role === "assistant" && msg.meta) {
                return msg.meta;
            }
        }
        return null;
    }, [messages]);

    const askQuestion = async (value: string) => {
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
            content: "Dang xu ly cau hoi...",
            pending: true,
        };

        setMessages((prev) => [...prev, userMsg, pendingMsg]);
        setQuestion("");
        setIsSubmitting(true);

        try {
            const response = await fetchWithAuth(`${API}/finagent/query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: trimmed,
                    session_id: currentSessionId || getOrCreateSessionId(),
                    include_debug: includeDebug,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                const detail = typeof payload?.detail === "string" ? payload.detail : "Khong the goi Fin Agent";
                throw new Error(detail);
            }

            const data = payload as FinAgentResponse;
            const assistantMsg: Message = {
                id: pendingId,
                role: "assistant",
                content: data.answer,
                pending: false,
                meta: data,
            };

            setMessages((prev) => prev.map((msg) => (msg.id === pendingId ? assistantMsg : msg)));
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Loi khong xac dinh";
            const assistantError: Message = {
                id: pendingId,
                role: "assistant",
                content: errMsg,
                pending: false,
                error: true,
            };
            setMessages((prev) => prev.map((msg) => (msg.id === pendingId ? assistantError : msg)));
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
        <div className="flex h-[calc(100vh-64px)] flex-col bg-background relative">
            {/* Header / History Dropdown Wrapper */}
            <div className="absolute right-4 top-4 z-50">
                <div className="relative">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Lich su Chat"
                    >
                        <History className="h-5 w-5" />
                    </button>

                    {isHistoryOpen && (
                        <div className="absolute right-0 top-12 w-72 origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                                <h3 className="font-semibold text-foreground">Lich su tro chuyen</h3>
                                <button
                                    onClick={createNewChat}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    New Chat
                                </button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto w-full">
                                {sessions.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                        <MessagesSquare className="h-8 w-8 opacity-20" />
                                        Chua co cuoc hoi thoai nao.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-border/50">
                                        {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map((session) => (
                                            <li key={session.id}>
                                                <button
                                                    onClick={() => loadSession(session.id)}
                                                    className={cn(
                                                        "group relative flex w-full flex-col items-start gap-1 p-3 text-left transition hover:bg-muted/50",
                                                        currentSessionId === session.id ? "bg-primary/5" : ""
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "w-full truncate text-[13px] font-medium",
                                                        currentSessionId === session.id ? "text-primary" : "text-foreground"
                                                    )}>
                                                        {session.title.replace("...", "")}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {new Date(session.updatedAt).toLocaleDateString("vi-VN", {
                                                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                                                        })} ({session.messages.length} msg)
                                                    </span>
                                                    
                                                    {/* Optional Delete Button */}
                                                    <button
                                                        type="button"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 hover:text-red-500 group-hover:opacity-100 z-10 transition-opacity p-1 bg-card rounded-md"
                                                        onClick={(e) => deleteSession(session.id, e)}
                                                    >
                                                        &#10005;
                                                    </button>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Header */}
            {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4">
                    <div className="mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Bot className="h-8 w-8" />
                        </div>
                    </div>
                    <h1 className="mb-2 text-center text-2xl font-semibold text-foreground md:text-3xl">Co the toi giup gi cho ban hom nay?</h1>
                    <p className="mb-8 text-center text-muted-foreground">
                        Fin Agent RAG + Text-to-SQL.
                    </p>
                    <div className="grid w-full max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
                        {SUGGESTIONS.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => askQuestion(item)}
                                className="flex items-center rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground shadow-sm"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 py-8">
                    <div className="mx-auto flex max-w-3xl flex-col gap-8">
                        {messages.map((msg) => (
                            <article
                                key={msg.id}
                                className={cn("flex w-full gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                            >
                                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                                    {msg.role === "user" ? <UserCircle2 className="h-5 w-5 text-muted-foreground" /> : <Bot className="h-5 w-5 text-foreground" />}
                                </div>

                                <div className={cn("flex max-w-[85%] flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                                    <div
                                        className={cn(
                                            "text-[15px] leading-relaxed",
                                            msg.role === "user"
                                                ? "rounded-2xl bg-muted px-5 py-3.5 text-foreground"
                                                : msg.error
                                                ? "rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
                                                : "text-foreground pt-1"
                                        )}
                                    >
                                        <div className="whitespace-pre-wrap">{msg.content}</div>

                                        {msg.pending && (
                                            <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Dang tao SQL va truy van du lieu...
                                            </div>
                                        )}

                                        {msg.meta && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="rounded bg-muted/50 px-2 py-1">intent: {msg.meta.intent}</span>
                                                    {msg.meta.cache_hit && (
                                                        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                            cache: {msg.meta.cache_type}
                                                        </span>
                                                    )}
                                                    {msg.meta.row_count > 0 && <span className="rounded bg-muted/50 px-2 py-1">rows: {msg.meta.row_count}</span>}
                                                    {msg.meta.model_used && (
                                                        <span className="rounded bg-muted/50 px-2 py-1">model: {msg.meta.model_used}</span>
                                                    )}
                                                </div>

                                                {msg.meta.sql && (
                                                    <details className="overflow-hidden rounded-xl border border-border">
                                                        <summary className="cursor-pointer bg-muted/30 px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/50">SQL da thuc thi</summary>
                                                        <div className="bg-card p-3">
                                                            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                                                                {msg.meta.sql}
                                                            </pre>
                                                        </div>
                                                    </details>
                                                )}

                                                {msg.meta.rows.length > 0 && (
                                                    <details className="overflow-hidden rounded-xl border border-border" open>
                                                        <summary className="cursor-pointer bg-muted/30 px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/50">Xem truoc ket qua ({msg.meta.rows.length} dong)</summary>
                                                        <div className="overflow-x-auto bg-card p-3">
                                                            <table className="min-w-full border-collapse text-[11px]">
                                                                <thead>
                                                                    <tr>
                                                                        {Object.keys(msg.meta.rows[0] ?? {}).map((col) => (
                                                                            <th key={col} className="border-b border-border pb-2 pr-4 text-left font-semibold text-foreground whitespace-nowrap">
                                                                                {col}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {msg.meta.rows.slice(0, 5).map((row, idx) => (
                                                                        <tr key={`${msg.id}-row-${idx}`}>
                                                                            {Object.keys(msg.meta?.rows[0] ?? {}).map((col) => (
                                                                                <td key={`${msg.id}-${idx}-${col}`} className="border-b border-border/60 py-2 pr-4 align-top text-muted-foreground whitespace-nowrap">
                                                                                    {toText(row[col])}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                        <div ref={endRef} className="h-4" />
                    </div>
                </div>
            )}

            {/* Input Form at bottom */}
            <div className="mx-auto w-full max-w-3xl px-4 pb-6 mt-auto">
                <form onSubmit={onSubmit} className="relative flex flex-col rounded-2xl border border-border bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        rows={1}
                        placeholder="Hoi Fin Agent ve tai chinh..."
                        className="max-h-[200px] min-h-[56px] w-full resize-none rounded-2xl bg-transparent py-4 pl-4 pr-14 text-[15px] outline-none placeholder:text-muted-foreground"
                    />
                    <div className="absolute right-3 top-3">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                        </button>
                    </div>
                </form>
                {/* Footer Tools/Info */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
                    <label className="flex cursor-pointer items-center gap-1.5 hover:text-foreground transition-colors">
                        <input
                            type="checkbox"
                            checked={includeDebug}
                            onChange={(e) => setIncludeDebug(e.target.checked)}
                            className="h-3 w-3 rounded-sm border-muted-foreground accent-foreground"
                        />
                        <span>Debug Mode</span>
                    </label>
                    <span>AI co the mac loi, vui long xac minh ket qua.</span>
                </div>
            </div>
        </div>
    );
}
