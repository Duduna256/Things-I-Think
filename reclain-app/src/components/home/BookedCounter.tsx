"use client";

import { useEffect, useState } from "react";
import { nextCount } from "./stats";

// "3,482 appointments booked today". Starts from the server's number (so the first paint
// matches) and then follows the clock. It never steps backwards, even after a reload.
export function BookedCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const tick = () => setCount(prev => nextCount(prev));
    const timer = window.setInterval(tick, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="booked-today">
      <strong>{count.toLocaleString("en-US")}</strong> appointments booked today
    </p>
  );
}
