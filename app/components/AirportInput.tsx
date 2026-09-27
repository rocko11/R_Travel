"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/types";

export interface PlaceValue {
  iata: string;
  label: string;
  lat?: number;
  lon?: number;
}

export default function AirportInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value?.label ?? "");
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setText(value?.label ?? ""), [value?.iata, value?.label]);

  useEffect(() => {
    if (!open || text.length < 2 || text === value?.label) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(text)}`, { signal: ctl.signal });
        const j = await r.json();
        setItems(j.places ?? []);
        setActive(0);
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [text, open, value?.label]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (p: Place) => {
    const v = { iata: p.iata, label: `${p.city} (${p.iata})`, lat: p.lat, lon: p.lon };
    onChange(v);
    setText(v.label);
    setOpen(false);
  };

  return (
    <div className="field" ref={boxRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter") { e.preventDefault(); pick(items[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && items.length > 0 && text.length >= 2 && (
        <div className="pop" id={`${id}-list`} role="listbox">
          {items.map((p, i) => (
            <button
              type="button"
              key={`${p.iata}-${p.type}`}
              role="option"
              aria-selected={i === active}
              className="opt"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
            >
              <span className="code">{p.iata}</span>
              <span>
                {p.city}
                <div className="sub">{p.type === "city" ? "All airports" : p.name}{p.country ? ` · ${p.country}` : ""}</div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
