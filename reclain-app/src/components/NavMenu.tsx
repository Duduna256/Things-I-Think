"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Icon } from "./Icon";

export function NavMenu({ signedIn, name, ownsBusiness, isAdmin }: { signedIn: boolean; name: string | null; ownsBusiness: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on navigation, outside click and Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Hairline under the nav once the page scrolls.
  useEffect(() => {
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);
  return (
    <div className="menu-wrap" ref={wrap}>
      <button type="button" className="pill-btn" aria-expanded={open} aria-controls="menuPanel" onClick={() => setOpen(o => !o)}>
        <span>{signedIn && name ? name.split(" ")[0] : "Menu"}</span>
        <Icon name="menu" />
      </button>
      <div className="menu-panel" id="menuPanel" hidden={!open}>
        <p className="menu-label">For customers</p>
        {signedIn ? (
          <>
            <Link className="menu-item" href="/bookings" onClick={close}>My bookings</Link>
            <Link className="menu-item" href="/account" onClick={close}>Account</Link>
          </>
        ) : (
          <Link className="menu-item" href="/login" onClick={close}>Log in or sign up</Link>
        )}
        <Link className="menu-item" href="/search" onClick={close}>Find a venue</Link>
        <Link className="menu-item" href="/#faq" onClick={close}>Help and support</Link>
        <p className="menu-label">For business</p>
        {ownsBusiness ? (
          <Link className="menu-item" href="/business" onClick={close}>Business dashboard</Link>
        ) : (
          <Link className="menu-item" href="/business/onboarding" onClick={close}>List your business</Link>
        )}
        <Link className="menu-item" href="/for-business" onClick={close}>How Reclain works for pros</Link>
        {isAdmin && <Link className="menu-item" href="/admin" onClick={close}>Admin</Link>}
        {signedIn && (
          <form action={signOut}>
            <button type="submit" className="menu-item">Log out</button>
          </form>
        )}
      </div>
    </div>
  );
}
