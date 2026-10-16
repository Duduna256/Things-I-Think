"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/Icon";
import type { AreaGroup } from "./stats";
import { buildSuggestions, searchHref, type SuggestIndex, type SuggestOption } from "./suggest";

export interface SearchDefaults {
  q?: string;
  area?: string;
  when?: string;
}

const WHEN = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
];

// The three-part search: what (a combobox with suggestions), where (areas by region) and when.
// Works as a plain GET form to /search without JavaScript.
export function SearchPill({
  index,
  areaGroups,
  placeholder,
  defaults = {},
  keepCat = "",
  compact = false,
  id,
}: {
  index: SuggestIndex;
  areaGroups: AreaGroup[];
  placeholder: string;
  defaults?: SearchDefaults;
  keepCat?: string; // the category being browsed; kept when the text box is empty
  compact?: boolean;
  id?: string; // the form's id, so other controls (the search page's chips) can read it
}) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [q, setQ] = useState(defaults.q ?? "");
  const [area, setArea] = useState(defaults.area ?? "");
  const [when, setWhen] = useState(defaults.when ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  const groups = useMemo(() => buildSuggestions(q, index), [q, index]);
  const flat = useMemo(() => groups.flatMap(g => g.options), [groups]);
  // Where each group's options start in the flat list (for ids and arrow keys).
  const starts = useMemo(() => groups.map((_, gi) => groups.slice(0, gi).reduce((sum, g) => sum + g.options.length, 0)), [groups]);
  const expanded = open && flat.length > 0;

  const activeId = expanded && active >= 0 ? optionId(active) : undefined;

  // Keep the highlighted suggestion in view when moving with the arrow keys.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const close = () => {
    window.clearTimeout(blurTimer.current);
    setOpen(false);
    setActive(-1);
  };
  // On some touch browsers the input blurs before a tapped suggestion gets its click,
  // so closing waits a moment; focusing again cancels it.
  const closeSoon = () => {
    window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(close, 150);
  };
  const reopen = () => {
    window.clearTimeout(blurTimer.current);
    setOpen(true);
  };

  const choose = (o: SuggestOption) => {
    close();
    if (o.kind === "venue") {
      router.push(`/v/${encodeURIComponent(o.value)}`);
    } else if (o.kind === "cat") {
      setQ("");
      router.push(searchHref({ cat: o.value, area, when }));
    } else {
      setQ(o.value);
      router.push(searchHref({ q: o.value, area, when }));
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    close();
    const text = q.trim();
    router.push(searchHref({ q: text, cat: text ? "" : keepCat, area, when }));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = flat.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!n) return;
      e.preventDefault();
      const down = e.key === "ArrowDown";
      if (!expanded) {
        setOpen(true);
        setActive(down ? 0 : n - 1);
        return;
      }
      setActive(a => (a < 0 ? (down ? 0 : n - 1) : (a + (down ? 1 : -1) + n) % n));
    } else if (e.key === "Enter") {
      if (expanded && active >= 0 && flat[active]) {
        e.preventDefault();
        choose(flat[active]);
      }
    } else if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        close();
      } else if (q) {
        e.preventDefault();
        setQ("");
      }
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <form id={id} className={compact ? "search-pill is-compact" : "search-pill"} action="/search" method="get" role="search" aria-label="Find a service or business" onSubmit={onSubmit}>
      <label className="seg seg-what">
        <Icon name="search" />
        <span className="sr-only">Service or business</span>
        <input
          name="q"
          type="text"
          value={q}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={reopen}
          onClick={reopen}
          onBlur={closeSoon}
          onKeyDown={onKeyDown}
        />
      </label>
      {keepCat && !q.trim() && <input type="hidden" name="cat" value={keepCat} />}
      <span className="seg-div" aria-hidden="true" />
      <label className="seg seg-where">
        <Icon name="pin" />
        <span className="sr-only">Area</span>
        <select name="area" value={area} onChange={e => setArea(e.target.value)}>
          <option value="">All areas</option>
          {areaGroups.map(g => (
            <optgroup key={g.region} label={g.region}>
              {g.areas.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <span className="seg-div" aria-hidden="true" />
      <label className="seg seg-when">
        <Icon name="cal" />
        <span className="sr-only">When</span>
        <select name="when" value={when} onChange={e => setWhen(e.target.value)}>
          {WHEN.map(w => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-black search-btn" type="submit">
        Search
      </button>
      {/* mousedown is cancelled so picking a suggestion doesn't blur the input first */}
      <div className="suggest" id={listId} role="listbox" aria-label="Suggestions" hidden={!expanded} onMouseDown={e => e.preventDefault()}>
        {groups.map((g, gi) => (
          <div key={g.label} role="group" aria-labelledby={`${uid}-g${gi}`}>
            <div className="suggest-label" id={`${uid}-g${gi}`}>
              {g.label}
            </div>
            {g.options.map((o, oi) => {
              const i = starts[gi] + oi;
              return (
                <div
                  key={`${o.kind}-${o.value}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "suggest-item is-active" : "suggest-item"}
                  onClick={() => choose(o)}
                  onMouseMove={() => i !== active && setActive(i)}
                >
                  <span className="sw" aria-hidden="true">
                    <Icon name={o.icon} />
                  </span>
                  <span>
                    <b>{o.title}</b>
                    <small>{o.sub}</small>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </form>
  );
}
