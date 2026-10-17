import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePlanner } from "../state/PlannerContext.jsx";
import { boundsOf } from "../lib/zips.js";
import { fmt, KIND, miles, peopleLabel, siteName } from "../lib/format.js";

const MILE_M = 1609.34;
// Esri's light-gray canvas: a quiet street base with its labels in a separate layer, so the labels can sit above the ZIPs.
const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const INK = "#14181b", PAPER = "#f2efe5", GAP = "#e0431b", SIGNAL = "#f4c21f";
const NO_SHAPES = { zips: {} };

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const pinIcon = (n) =>
  L.divIcon({ className: "ga-pin-wrap", html: `<span class="ga-pin"><b>${n}</b></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });

export default function MapView() {
  const P = usePlanner();
  const { county, plan, R, scale, activeZip, zipIndex, hoverCenter, focusReq, shapeError } = P;
  const shapes = P.shapes ?? (shapeError ? NO_SHAPES : null);

  const elRef = useRef(null);
  const S = useRef({ pins: new Map(), rings: new Map(), items: [], fitted: null });
  const cb = useRef(P);
  cb.current = P;

  // ---- the map itself, once ----
  useEffect(() => {
    const el = elRef.current;
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomSnap: 0,
      zoomDelta: 0.5,
      inertiaDeceleration: 2200,
      easeLinearity: 0.18,
      minZoom: 3,
      maxZoom: 17,
    }).setView([39, -98], 4);
    ["zips", "gaps", "labels", "rings", "focus"].forEach((name, i) => {
      map.createPane(name).style.zIndex = String(410 + i * 10);
    });
    L.tileLayer(TILES, { maxNativeZoom: 16, maxZoom: 19, className: "ga-tiles" }).addTo(map);
    L.tileLayer(LABELS, { maxNativeZoom: 16, maxZoom: 19, pane: "labels", className: "ga-labels" }).addTo(map);
    L.control.scale({ position: "bottomleft", maxWidth: 110 }).addTo(map);

    Object.assign(S.current, {
      map,
      zipLayer: L.layerGroup().addTo(map),
      gapLayer: L.layerGroup().addTo(map),
      ringLayer: L.layerGroup().addTo(map),
      pinLayer: L.layerGroup().addTo(map),
      focusLayer: L.layerGroup().addTo(map),
    });

    // Smooth wheel and pinch zoom: each wheel event moves a target zoom, and every frame eases a fifth of the way
    // toward it around the cursor. Fractional zoom (zoomSnap 0) keeps it continuous instead of stepping by levels.
    let target = null, anchor = null, raf = 0;
    const ease = () => {
      const z = map.getZoom(), d = target - z;
      const done = Math.abs(d) < 0.003;
      map.setZoomAround(anchor, done ? target : z + d * 0.2, { animate: false });
      if (done) { target = null; raf = 0; } else raf = requestAnimationFrame(ease);
    };
    const onWheel = (e) => {
      e.preventDefault();
      const per = e.deltaMode === 1 ? 0.06 : e.ctrlKey ? 0.012 : 0.0024;     // lines, pinch, pixels
      target = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), (target ?? map.getZoom()) - e.deltaY * per));
      anchor = map.mouseEventToContainerPoint(e);
      if (!raf) raf = requestAnimationFrame(ease);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      const s = S.current;
      if (s.bounds && s.fitted !== "done" && el.clientWidth > 40) {
        map.fitBounds(s.bounds, { padding: [30, 30], animate: false });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      map.remove();
      S.current = { pins: new Map(), rings: new Map(), items: [], fitted: null };
    };
  }, []);

  // ---- ZIP polygons: rebuilt when the county (or its boundaries) change ----
  useEffect(() => {
    const s = S.current;
    if (!s.map || !county || !shapes) return;
    s.zipLayer.clearLayers();
    s.gapLayer.clearLayers();
    s.focusLayer.clearLayers();
    const bind = (layer, z) => {
      layer.bindTooltip("", { sticky: true, direction: "top", offset: [0, -6], className: "ga-tip", opacity: 1 });
      layer.on({
        mouseover: () => cb.current.setHoverZip(z.z),
        mouseout: () => cb.current.setHoverZip(null),
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          cb.current.setPinZip((cur) => (cur === z.z ? null : z.z));
        },
      });
    };
    s.items = county.zips.map((z) => {
      const ent = shapes.zips[z.z];
      if (ent) {
        const base = L.polygon(ent.p, { pane: "zips", color: PAPER, weight: 1.1, fillOpacity: 0.88, smoothFactor: 0.5, bubblingMouseEvents: false });
        const gap = L.polygon(ent.p, { pane: "gaps", interactive: false, stroke: false, fillColor: "url(#ga-hatch)", fillOpacity: 0, smoothFactor: 0.5 });
        bind(base, z);
        s.zipLayer.addLayer(base);
        s.gapLayer.addLayer(gap);
        return { base, gap, point: false };
      }
      const base = L.circleMarker([z.lat, z.lon], { pane: "zips", radius: 5, color: PAPER, weight: 1.4, fillOpacity: 0.95, bubblingMouseEvents: false });
      bind(base, z);
      s.zipLayer.addLayer(base);
      return { base, gap: null, point: true };
    });
    s.bounds = L.latLngBounds(boundsOf(shapes, county.zips));
    if (s.map.getContainer().clientWidth > 40) {
      const first = s.fitted == null;
      if (first) s.map.fitBounds(s.bounds, { padding: [30, 30], animate: false });
      else s.map.flyToBounds(s.bounds, { padding: [30, 30], duration: 1.1 });
      s.fitted = "done";
    }
    s.styledFor = null;
  }, [county, shapes]);

  // ---- colours: people shade, out-of-reach hatch, tooltips ----
  useEffect(() => {
    const s = S.current;
    if (!s.map || !county || !shapes || !scale || !plan || s.items.length !== county.zips.length) return;
    const raise = [];
    county.zips.forEach((z, i) => {
      const it = s.items[i];
      const out = plan.uncovered.has(i);
      const fill = scale.colors[scale.classes[i]];
      if (it.point) it.base.setStyle({ fillColor: fill, color: out ? GAP : PAPER, weight: out ? 2.4 : 1.4 });
      else {
        it.base.setStyle({ fillColor: fill, color: out ? GAP : PAPER, weight: out ? 1.8 : 1.1 });
        it.gap.setStyle({ fillOpacity: out ? 1 : 0 });
        if (out) raise.push(it.base);
      }
      const d = plan.nearD[i];
      it.base.setTooltipContent(
        `<b>ZIP ${z.z}</b><span>${peopleLabel(z)} people</span><em class="${out ? "out" : "in"}">${out ? "Out of reach" : "Within reach"} · ${miles(d)} mi to #${plan.nearN[i]}</em>`
      );
    });
    raise.forEach((l) => l.bringToFront());
  }, [county, shapes, scale, plan]);

  // ---- reach rings and numbered centers (reused between edits so dragging a slider does not flicker) ----
  useEffect(() => {
    const s = S.current;
    if (!s.map || !plan) return;
    if (s.pinsFor !== county) {                       // site indexes mean different places in another county
      s.pinLayer.clearLayers();
      s.ringLayer.clearLayers();
      s.pins.clear();
      s.pinsFor = county;
    }
    const keep = new Set(plan.chosen.map((c) => c.idx));
    for (const [idx, e] of s.pins) {
      if (!keep.has(idx)) {
        s.pinLayer.removeLayer(e.marker);
        s.ringLayer.removeLayer(e.halo);
        s.ringLayer.removeLayer(e.ring);
        s.pins.delete(idx);
      }
    }
    plan.chosen.forEach((c) => {
      let e = s.pins.get(c.idx);
      if (!e) {
        const at = [c.lat, c.lon];
        const halo = L.circle(at, { pane: "rings", interactive: false, radius: R * MILE_M, color: PAPER, weight: 4, opacity: 0.7, fill: false });
        const ring = L.circle(at, { pane: "rings", interactive: false, radius: R * MILE_M, color: INK, weight: 1.2, opacity: 0.92, dashArray: "4 5", fill: false });
        const marker = L.marker(at, { icon: pinIcon(c.n), zIndexOffset: 1000 - c.n, keyboard: false });
        marker.bindTooltip("", { direction: "top", offset: [0, -16], className: "ga-tip", opacity: 1 });
        marker.on("mouseover", () => cb.current.setHoverCenter(marker._n));
        marker.on("mouseout", () => cb.current.setHoverCenter(null));
        s.ringLayer.addLayer(halo);
        s.ringLayer.addLayer(ring);
        s.pinLayer.addLayer(marker);
        e = { marker, halo, ring, n: c.n };
        s.pins.set(c.idx, e);
      } else {
        e.halo.setRadius(R * MILE_M);
        e.ring.setRadius(R * MILE_M);
        if (e.n !== c.n) {
          e.marker.setIcon(pinIcon(c.n));
          e.n = c.n;
        }
      }
      e.marker._n = c.n;
      e.marker.setTooltipContent(`<b>${c.n}. ${esc(siteName(c).name)}</b><span>${esc(KIND[c.type] ?? c.type)} · +${fmt(c.gain)} people newly in reach</span>`);
    });
  }, [plan, R, county]);

  useEffect(() => {
    for (const e of S.current.pins.values()) {
      const hot = hoverCenter != null && e.n === hoverCenter;
      e.marker.getElement()?.classList.toggle("is-hot", hot);
      e.ring.setStyle({ weight: hot ? 2.4 : 1.2, opacity: hot ? 1 : 0.92 });
    }
  }, [hoverCenter, plan]);

  // ---- the ZIP under the cursor or pinned: outline, a line to its nearest center, and the distance ----
  useEffect(() => {
    const s = S.current;
    if (!s.map || !county || !plan) return;
    s.focusLayer.clearLayers();
    if (!activeZip) return;
    const i = zipIndex.get(activeZip);
    if (i == null) return;
    const z = county.zips[i];
    const it = s.items[i];
    if (it && !it.point) {
      const ll = it.base.getLatLngs();
      s.focusLayer.addLayer(L.polygon(ll, { pane: "focus", interactive: false, fill: false, color: INK, weight: 5, opacity: 0.9 }));
      s.focusLayer.addLayer(L.polygon(ll, { pane: "focus", interactive: false, fill: false, color: SIGNAL, weight: 2.4 }));
    } else {
      s.focusLayer.addLayer(L.circleMarker([z.lat, z.lon], { pane: "focus", interactive: false, radius: 9, fill: false, color: SIGNAL, weight: 3 }));
    }
    const c = plan.chosen[plan.nearN[i] - 1];
    if (c) {
      const line = L.polyline([[z.lat, z.lon], [c.lat, c.lon]], { pane: "focus", interactive: false, color: INK, weight: 1.6, dashArray: "2 5" });
      line.bindTooltip(`${miles(plan.nearD[i])} mi`, { permanent: true, direction: "center", className: "ga-dist", opacity: 1 });
      s.focusLayer.addLayer(line);
      s.focusLayer.addLayer(L.circleMarker([z.lat, z.lon], { pane: "focus", interactive: false, radius: 3.5, color: PAPER, weight: 1.5, fillColor: INK, fillOpacity: 1 }));
    }
  }, [activeZip, plan, county, shapes, zipIndex]);

  useEffect(() => {
    const m = S.current.map;
    if (m && focusReq) m.flyTo([focusReq.lat, focusReq.lon], Math.max(m.getZoom(), 11), { duration: 0.8 });
  }, [focusReq]);

  const zoom = (d) => S.current.map?.flyTo(S.current.map.getCenter(), S.current.map.getZoom() + d, { duration: 0.35 });
  const fit = () => S.current.bounds && S.current.map.flyToBounds(S.current.bounds, { padding: [30, 30], duration: 0.8 });
  return (
    <section className="card map-card" data-map-cell aria-label="Map of ZIP codes, planned centers and reach">
      <div ref={elRef} className="map" />
      <div className="map-tag">
        <b>{county ? county.name : "Loading…"}</b>
        <span>{county ? `${county.zips.length} ZIPs` : ""}</span>
      </div>
      <div className="map-ctl">
        <button type="button" onClick={() => zoom(0.5)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(-0.5)} aria-label="Zoom out">−</button>
        <button type="button" onClick={fit} aria-label="Fit the county" title="Fit the county">◎</button>
      </div>
      {!shapes && !shapeError && <div className="map-wait">Drawing ZIP boundaries…</div>}
      {shapeError && <div className="map-wait warn">Boundaries unavailable. Showing ZIP points.</div>}
      <div className="map-foot">
        <span className="map-attr">
          ZIP boundaries: US Census ZCTA · Basemap © Esri, HERE, Garmin, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
        </span>
      </div>
    </section>
  );
}
