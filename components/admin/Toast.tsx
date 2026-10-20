"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; message: string; kind: Kind }
interface ToastApi { push: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastApi>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = nextId.current++;
    setItems((l) => [...l.slice(-3), { id, message, kind }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
  }, [dismiss]);
  const api = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="a-toasts" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`a-toast a-toast-${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <Icon name={t.kind === "error" ? "alert" : "check"} />
            <span>{t.message}</span>
            <button type="button" className="a-toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="close" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
