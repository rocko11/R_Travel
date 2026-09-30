"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import type { HotelEstimate } from "@/lib/hotels";

declare global {
  interface Window {
    L?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let leafletLoading: Promise<void> | null = null;

/** Loads Leaflet from a CDN once and caches the promise, so switching views repeatedly doesn't re-fetch it. */
function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the map."));
    document.body.appendChild(script);
  });
  return leafletLoading;
}

/**
 * Pin map of a city's hotel results, using Leaflet + free OpenStreetMap tiles (no API key).
 * Only hotels with real coordinates (from a live liteAPI result) get a pin — synthetic
 * estimates don't carry lat/lng, so the map is only useful once live rates are showing.
 */
export default function HotelMap({
  hotels,
  rooms,
  selected,
  onSelect,
}: {
  hotels: (HotelEstimate & { hotel: { lat?: number; lng?: number } })[];
  rooms: number;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [error, setError] = useState("");

  const pinned = hotels.filter((h) => h.hotel.lat != null && h.hotel.lng != null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !elRef.current || !window.L) return;
        if (!mapRef.current) {
          mapRef.current = window.L.map(elRef.current);
          window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
        }
      })
      .catch(() => !cancelled && setError("Could not load the map."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    const layer = window.L.layerGroup().addTo(map);
    const pts: [number, number][] = [];
    for (const h of pinned) {
      const lat = h.hotel.lat!, lng = h.hotel.lng!;
      pts.push([lat, lng]);
      const price =
        h.low === h.high ? money(h.low * rooms, "USD").replace(".00", "") : `${money(h.low * rooms, "USD").replace(".00", "")}+`;
      const marker = window.L.marker([lat, lng]).addTo(layer);
      marker.bindPopup(`<b>${h.hotel.name}</b><br>${price} total<br><a href="#" data-pick="${h.hotel.name}">Select</a>`);
      marker.on("click", () => onSelect(h.hotel.name));
      if (h.hotel.name === selected) marker.openPopup();
    }
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
    else map.setView([20, 0], 2);
    return () => {
      layer.remove();
    };
  }, [pinned, selected, rooms, onSelect]);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {error ? (
        <div className="state">{error}</div>
      ) : !pinned.length ? (
        <div className="state">No mappable properties here yet — map pins need live rates with coordinates.</div>
      ) : null}
      <div ref={elRef} style={{ height: 480, display: error || !pinned.length ? "none" : "block" }} />
    </div>
  );
}
