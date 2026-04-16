"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const STORAGE_NEVER_SHOW_KEY = "finvision:price-board-popup:never-show";
const STORAGE_HIDE_TODAY_KEY = "finvision:price-board-popup:hide-today";
const SESSION_CLOSE_KEY = "finvision:price-board-popup:session-closed";

function getVietnamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const hour = Number(map.hour);

  return { dateKey, hour };
}

export function PriceBoardPopup() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  const evaluateVisibility = useCallback(() => {
    const { dateKey, hour } = getVietnamNow();
    const isInDisplayWindow = hour >= 9 && hour < 15;

    if (!isInDisplayWindow) {
      setIsVisible(false);
      return;
    }

    const shouldNeverShow = localStorage.getItem(STORAGE_NEVER_SHOW_KEY) === "1";
    const hiddenDate = localStorage.getItem(STORAGE_HIDE_TODAY_KEY);
    const sessionClosed = sessionStorage.getItem(SESSION_CLOSE_KEY) === dateKey;

    const shouldHideToday = hiddenDate === dateKey;
    setIsVisible(!shouldNeverShow && !shouldHideToday && !sessionClosed);
  }, []);

  useEffect(() => {
    evaluateVisibility();

    const interval = window.setInterval(() => {
      evaluateVisibility();
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [evaluateVisibility]);

  const persistPreferences = useCallback(() => {
    const { dateKey } = getVietnamNow();

    if (neverShowAgain) {
      localStorage.setItem(STORAGE_NEVER_SHOW_KEY, "1");
    }

    if (hideToday) {
      localStorage.setItem(STORAGE_HIDE_TODAY_KEY, dateKey);
    }

    sessionStorage.setItem(SESSION_CLOSE_KEY, dateKey);
  }, [hideToday, neverShowAgain]);

  const closePopup = useCallback(() => {
    persistPreferences();
    setIsVisible(false);
  }, [persistPreferences]);

  const onNeverShowAgainChange = useCallback((checked: boolean) => {
    setNeverShowAgain(checked);
    if (checked) {
      localStorage.setItem(STORAGE_NEVER_SHOW_KEY, "1");
      return;
    }
    localStorage.removeItem(STORAGE_NEVER_SHOW_KEY);
  }, []);

  const onHideTodayChange = useCallback((checked: boolean) => {
    setHideToday(checked);
    if (checked) {
      const { dateKey } = getVietnamNow();
      localStorage.setItem(STORAGE_HIDE_TODAY_KEY, dateKey);
      return;
    }
    localStorage.removeItem(STORAGE_HIDE_TODAY_KEY);
  }, []);

  const openPriceBoardPage = useCallback(() => {
    persistPreferences();
    setIsVisible(false);
    router.push("/price-board");
  }, [persistPreferences, router]);

  const checkboxIdNever = useMemo(() => "price-board-popup-never", []);
  const checkboxIdToday = useMemo(() => "price-board-popup-today", []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[1px]"
      onClick={closePopup}
      role="presentation"
    >
      <div
        className="fixed left-4 bottom-4 z-[92] rounded-xl border border-border/60 bg-background/95 p-3 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2 text-sm">
          <label htmlFor={checkboxIdNever} className="flex items-center gap-2 cursor-pointer">
            <input
              id={checkboxIdNever}
              type="checkbox"
              checked={neverShowAgain}
              onChange={(event) => onNeverShowAgainChange(event.target.checked)}
              className="h-4 w-4"
            />
            <span>Không hiển thị lần sau</span>
          </label>

          <label htmlFor={checkboxIdToday} className="flex items-center gap-2 cursor-pointer">
            <input
              id={checkboxIdToday}
              type="checkbox"
              checked={hideToday}
              onChange={(event) => onHideTodayChange(event.target.checked)}
              className="h-4 w-4"
            />
            <span>Không hiển thị trong ngày hôm nay</span>
          </label>
        </div>
      </div>

      <div
        className="relative mx-auto mt-[6vh] h-[80vh] w-[80vw] max-w-[1440px] min-h-[460px] min-w-[320px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label="Đóng popup bảng điện"
          className="absolute right-2 top-2 z-20 rounded-full bg-background/85 p-1.5 text-foreground hover:bg-background"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={openPriceBoardPage}
          className="absolute inset-0 z-10"
          aria-label="Mở trang bảng điện"
        />

        <iframe
          title="Bảng điện giao dịch"
          src="/price-board"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
