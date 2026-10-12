"use client";

// One place for "Done" messages. A booking marked completed can vanish from a filtered list,
// taking its own message with it, so successes are announced here instead. If the button that
// had focus has gone, focus moves to the message so keyboard users aren't dropped at the top.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Announce = (text: string) => void;
const Ctx = createContext<Announce | null>(null);

export function useAnnounce(): Announce | null {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  const announce = useCallback<Announce>(text => {
    setFocused(false);
    setToast(t => ({ text, n: (t?.n ?? 0) + 1 }));
  }, []);

  // Land focus on the message only when the thing that had it has disappeared.
  useEffect(() => {
    if (!toast) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) ref.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [toast]);

  // Hide after a while, but never while it has focus.
  useEffect(() => {
    if (!toast || focused) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast, focused]);

  return (
    <Ctx.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" className="dash-live">
        {toast && (
          <p
            key={toast.n}
            ref={ref}
            tabIndex={-1}
            className="toast dash-toast"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            {toast.text}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}
