// Stroke icons drawn on a 24×24 grid. The sprite is rendered once in the root layout;
// <Icon name="star" /> reuses it. Add an icon: add a <symbol> below and its name to IconName.

export type IconName =
  | "search" | "pin" | "cal" | "left" | "right" | "close" | "check" | "plus" | "minus" | "clock" | "home" | "store"
  | "menu" | "user" | "users" | "star" | "scissors" | "braid" | "comb" | "stones" | "polish" | "ring" | "shirt"
  | "sparkle" | "shield" | "wrench" | "money" | "chat" | "id" | "arrow" | "phone" | "card" | "logout" | "edit"
  | "trash" | "chart" | "settings" | "list" | "alert" | "eye" | "mail" | "google";

export function Icon({ name, className = "ic", label }: { name: IconName | string; className?: string; label?: string }) {
  return (
    <svg className={className} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></symbol>
      <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></symbol>
      <symbol id="i-cal" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></symbol>
      <symbol id="i-left" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></symbol>
      <symbol id="i-right" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></symbol>
      <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></symbol>
      <symbol id="i-store" viewBox="0 0 24 24"><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5V20h16V9.5" /><path d="M9.5 20v-5h5v5" /></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></symbol>
      <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" /><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 13.8a6.5 6.5 0 0 1 4 5.7" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1l-5.7 3 1.2-6.3-4.6-4.4 6.3-.8z" /></symbol>
      <symbol id="i-scissors" viewBox="0 0 24 24"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.6 8.6 20 18M8.6 15.4 20 6" /></symbol>
      <symbol id="i-braid" viewBox="0 0 24 24"><path d="M9 2.5c0 3 6 3 6 6s-6 3-6 6 6 3 6 6" /><path d="M15 2.5c0 3-6 3-6 6s6 3 6 6-6 3-6 6" /></symbol>
      <symbol id="i-comb" viewBox="0 0 24 24"><path d="M3 7.5h18v3.5H3z" /><path d="M5.5 11v6.5M9 11v6.5M12.5 11v6.5M16 11v6.5M19.5 11v4.5" /></symbol>
      <symbol id="i-stones" viewBox="0 0 24 24"><ellipse cx="12" cy="18" rx="7.5" ry="2.8" /><ellipse cx="12" cy="12" rx="5.2" ry="2.3" /><ellipse cx="12" cy="6.8" rx="3.2" ry="1.9" /></symbol>
      <symbol id="i-polish" viewBox="0 0 24 24"><rect x="6.5" y="10" width="11" height="11" rx="2.8" /><path d="M9.5 10V6.5h5V10M10.8 6.5V2.8h2.4v3.7" /></symbol>
      <symbol id="i-ring" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6" /><path d="m9.4 5.8 2.6-3 2.6 3-2.6 3z" /></symbol>
      <symbol id="i-shirt" viewBox="0 0 24 24"><path d="M8.5 3 3 6.2l2.1 4 1.9-1V21h10V9.2l1.9 1 2.1-4L15.5 3a3.5 3.5 0 0 1-7 0z" /></symbol>
      <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M11 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" /><path d="M19 15.5v5M16.5 18h5" /></symbol>
      <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></symbol>
      <symbol id="i-wrench" viewBox="0 0 24 24"><path d="M14.7 6.3a4.5 4.5 0 0 0 5.6 5.6l-8.6 8.6a2.4 2.4 0 0 1-3.4-3.4l8.6-8.6" /><path d="M14.7 6.3 17.5 3.5l3 3-2.8 2.8" /></symbol>
      <symbol id="i-money" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></symbol>
      <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H10l-6 4.5z" /><path d="M8 9.5h8M8 12.5h5" /></symbol>
      <symbol id="i-id" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16.2c.7-1.5 1.8-2.1 3.2-2.1s2.5.6 3.2 2.1M14.5 10h4M14.5 13.5h3" /></symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
      <symbol id="i-phone" viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></symbol>
      <symbol id="i-card" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></symbol>
      <symbol id="i-logout" viewBox="0 0 24 24"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16l-4-4 4-4M6 12h10" /></symbol>
      <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></symbol>
      <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></symbol>
      <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></symbol>
      <symbol id="i-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></symbol>
      <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.3" /></symbol>
      <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></symbol>
      <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 7 8.5-7" /></symbol>
      <symbol id="i-google" viewBox="0 0 24 24"><path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5z" /><path d="M12 21c2.4 0 4.4-.8 5.9-2.2L15 16.5c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21z" /><path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4a9 9 0 0 0 0 8z" /><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3L18 5.4A9 9 0 0 0 4 8l3 2.3c.7-2.1 2.7-3.7 5-3.7z" /></symbol>
    </svg>
  );
}
