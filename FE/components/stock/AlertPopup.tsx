import React, { useState } from "react";
import { Bell, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getOrCreateSessionId(): string {
  const key = "session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, generated);
  return generated;
}

export function AlertPopup({
  ticker,
  onClose,
  onSaved,
}: {
  ticker: string;
  onClose: () => void;
  onSaved?: (targetPrice: number) => void;
}) {
  const [condition, setCondition] = useState("GREATER_THAN");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!price || Number.isNaN(Number(price))) {
      window.alert("Please enter a valid price.");
      return;
    }

    try {
      setLoading(true);
      const targetPrice = Number(price);
      const res = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          condition_type: condition,
          target_price: targetPrice,
          session_id: getOrCreateSessionId(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create alert");
      onSaved?.(targetPrice);
      onClose();
    } catch {
      window.alert("Could not create alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-500" /> Price alert for {ticker}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-transparent dark:text-white dark:border-gray-600"
            >
              <option value="GREATER_THAN">Greater than</option>
              <option value="LESS_THAN">Less than</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Target price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 50000"
              className="w-full border rounded px-3 py-2 bg-transparent dark:text-white dark:border-gray-600"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save alert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
