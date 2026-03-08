'use client';

import { useCallback, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

// ── Session ID — tạo một lần per browser tab ──────────────────────
function getSessionId(): string {
    if (typeof window === 'undefined') return 'ssr-anonymous';
    let sid = sessionStorage.getItem('_sid');
    if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('_sid', sid);
    }
    return sid;
}

// ── Fire-and-forget POST helper ───────────────────────────────────
function firePost(path: string, body: object): void {
    fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // keepalive cho phép request hoàn thành khi tab đóng (dùng cho session/end)
        keepalive: true,
    }).catch(() => {
        // Bỏ qua lỗi — tracking không được làm gián đoạn UX
    });
}

// ────────────────────────────────────────────────────────────────────
// Hook chính
// ────────────────────────────────────────────────────────────────────
export function useTracking(userId?: number | null) {
    const sessionId = typeof window !== 'undefined' ? getSessionId() : 'ssr-anonymous';

    // ── Tìm kiếm chung (tin tức / từ khoá) ───────────────────────
    const trackSearch = useCallback(
        (keyword: string) => {
            if (!keyword.trim()) return;
            firePost('/tracking/search', { keyword: keyword.trim(), session_id: sessionId });
        },
        [sessionId],
    );

    // ── Tìm kiếm mã cổ phiếu ─────────────────────────────────────
    const trackStockSearch = useCallback(
        (keyword: string) => {
            if (!keyword.trim()) return;
            firePost('/tracking/stock-search', { keyword: keyword.trim(), session_id: sessionId });
        },
        [sessionId],
    );

    // ── Click vào sidebar ─────────────────────────────────────────
    const trackSidebarClick = useCallback(
        (menuName: string, menuHref: string) => {
            firePost('/tracking/sidebar-click', {
                menu_name: menuName,
                menu_href: menuHref,
                session_id: sessionId,
                user_id: userId ?? null,
            });
        },
        [sessionId, userId],
    );

    return { trackSearch, trackStockSearch, trackSidebarClick };
}

// ────────────────────────────────────────────────────────────────────
// Hook quản lý vòng đời phiên (session lifecycle)
// Dùng một lần duy nhất tại MainLayout
// ────────────────────────────────────────────────────────────────────
export function useSessionTracking(userId?: number | null) {
    const sessionId = typeof window !== 'undefined' ? getSessionId() : 'ssr-anonymous';
    const startedAt = useRef<number>(Date.now());
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionStartedRef = useRef(false);

    // Khởi động session khi mount lần đầu
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (sessionStartedRef.current) return;
        sessionStartedRef.current = true;

        // Bắt đầu session
        fetch(`${API}/tracking/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId ?? null,
            }),
        }).catch(() => {});

        // Heartbeat mỗi 30 giây
        heartbeatRef.current = setInterval(() => {
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/heartbeat', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        }, 30_000);

        // Kết thúc session khi đóng tab
        const handleUnload = () => {
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/end', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        };
        window.addEventListener('beforeunload', handleUnload);
        // visibilitychange: khi tab bị ẩn
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                const duration = Math.floor((Date.now() - startedAt.current) / 1000);
                firePost('/tracking/session/heartbeat', {
                    session_id: sessionId,
                    duration_seconds: duration,
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            window.removeEventListener('beforeunload', handleUnload);
            document.removeEventListener('visibilitychange', handleVisibility);
            // Gửi kết thúc phiên khi component unmount
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/end', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // chỉ chạy 1 lần khi mount

    // Cập nhật user_id trong session nếu user đăng nhập sau
    useEffect(() => {
        if (!userId) return;
        fetch(`${API}/tracking/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId,
            }),
        }).catch(() => {});
    }, [userId, sessionId]);
}
