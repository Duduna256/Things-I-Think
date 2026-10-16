"use client";

import Link from "next/link";
import { site } from "@shared/config/site";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@shared/auth/actions";
import { Icon } from "@shared/components/Icon";

export function NavMenu({ signedIn, name, ownsBusiness, isAdmin }: { signedIn: boolean; name: string | null; ownsBusiness: boolean; isAdmin: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // The page the menu was opened on. Going to another page closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((was: boolean) => boolean)) =>
    setOpenOn(prev => ((typeof value === "function" ? value(prev === pathname) : value) ? pathname : null));

  // Close on navigation (above), outside click, Escape (focus goes back to the button) and
  // tabbing out of the menu.
  useEffect(() => {
    if (!open) return;
    const el = wrap.current;
    const onClick = (e: MouseEvent) => {
      if (!el?.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    };
    // relatedTarget is null when focus goes nowhere in particular (a click on the panel's own
    // padding, or the window losing focus), so only a known element outside closes it.
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget;
      if (to instanceof Node && !el?.contains(to)) setOpenOn(null);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    el?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      el?.removeEventListener("focusout", onFocusOut);
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
      <button ref={button} type="button" className="pill-btn" aria-expanded={open} aria-controls="menuPanel" onClick={() => setOpen(o => !o)}>
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
        <Link className="menu-item" href="/search" onClick={close}>Find a service</Link>
        <Link className="menu-item" href="/#faq" onClick={close}>Help and support</Link>
        <p className="menu-label">For business</p>
        {ownsBusiness ? (
          <Link className="menu-item" href={site.businessUrl} onClick={close}>Business dashboard</Link>
        ) : (
          <Link className="menu-item" href={`${site.businessUrl}/onboarding`} onClick={close}>List your business</Link>
        )}
        <Link className="menu-item" href="/for-business" onClick={close}>How reClain works for pros</Link>
        {isAdmin && <Link className="menu-item" href={`${site.businessUrl}/admin`} onClick={close}>Admin</Link>}
        {signedIn && (
          <form action={signOut}>
            <button type="submit" className="menu-item">Log out</button>
          </form>
        )}
      </div>
    </div>
  );
}
