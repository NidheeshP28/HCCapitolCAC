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
  const { county, plan, R, scale, basemap, showSites, activeZip, zipIndex, hoverCenter, focusReq, shapeError } = P;
  const shapes = P.shapes ?? (shapeError ? NO_SHAPES : null);

  const elRef = useRef(null);
  const readoutRef = useRef(null);
  const hintRef = useRef(null);
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
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      minZoom: 3,
      maxZoom: 17,
    }).setView([39, -98], 4);
    ["sites", "zips", "gaps", "labels", "rings", "focus"].forEach((name, i) => {
      map.createPane(name).style.zIndex = String(405 + i * 10);
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
      siteLayer: L.layerGroup().addTo(map),
    });

    // The page scrolls, so the wheel scrolls the page; hold Ctrl/Cmd (or pinch) to zoom the map.
    let hintTimer = 0;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const z = map.getZoom() - e.deltaY * (e.deltaMode ? 0.4 : 0.012);
        map.setZoomAround(map.mouseEventToContainerPoint(e), Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), z)), { animate: false });
      } else if (hintRef.current) {
        hintRef.current.classList.add("show");
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => hintRef.current?.classList.remove("show"), 1400);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    map.on("mousemove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (readoutRef.current)
          readoutRef.current.textContent = `${Math.abs(e.latlng.lat).toFixed(4)}°${e.latlng.lat >= 0 ? "N" : "S"}  ${Math.abs(e.latlng.lng).toFixed(4)}°${e.latlng.lng >= 0 ? "E" : "W"}`;
      });
    });
    map.on("mouseout", () => {
      if (readoutRef.current) readoutRef.current.textContent = "—";
    });

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
      clearTimeout(hintTimer);
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

  // ---- every candidate site, on request ----
  useEffect(() => {
    const s = S.current;
    if (!s.map || !county) return;
    s.siteLayer.clearLayers();
    if (!showSites) return;
    const r = L.canvas({ pane: "sites", padding: 0.3 });
    county.sites.forEach((c) =>
      s.siteLayer.addLayer(L.circleMarker([c.lat, c.lon], { renderer: r, interactive: false, radius: 2.4, stroke: false, fillColor: INK, fillOpacity: 0.42 }))
    );
  }, [county, showSites]);

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

  const zoom = (d) => S.current.map?.setZoom(S.current.map.getZoom() + d);
  const fit = () => S.current.bounds && S.current.map.flyToBounds(S.current.bounds, { padding: [30, 30], duration: 0.8 });
  const copyLink = async (ev) => {
    const btn = ev.currentTarget;
    try {
      await navigator.clipboard.writeText(window.location.href);
      btn.dataset.done = "1";
      setTimeout(() => delete btn.dataset.done, 1400);
    } catch { /* clipboard blocked: the address bar already holds the link */ }
  };

  return (
    <section className={`card map-card${basemap ? "" : " no-basemap"}`} data-map-cell aria-label="Map of ZIP codes, planned centers and reach">
      <div ref={elRef} className="map" />
      <div className="map-tag">
        <i>Fig.</i>
        <b>{county ? county.name : "Loading…"}</b>
        <span>{county ? `${county.zips.length} ZIPs · ${fmt(county.total)} people` : ""}</span>
      </div>
      <div className="map-ctl">
        <button type="button" onClick={() => zoom(0.5)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(-0.5)} aria-label="Zoom out">−</button>
        <button type="button" onClick={fit} aria-label="Fit the county" title="Fit the county">◎</button>
        <button type="button" className="copy" onClick={copyLink} aria-label="Copy a link to this plan" title="Copy a link to this plan">
          <span>Link</span>
        </button>
      </div>
      <div ref={hintRef} className="map-hint">Hold <kbd>⌘</kbd>/<kbd>Ctrl</kbd> and scroll to zoom</div>
      {!shapes && !shapeError && <div className="map-wait">Drawing ZIP boundaries…</div>}
      {shapeError && <div className="map-wait warn">Boundaries unavailable. Showing ZIP points.</div>}
      <div className="map-foot">
        <span ref={readoutRef} className="map-readout">—</span>
        <span className="map-attr">
          ZIP boundaries: US Census ZCTA · Basemap © Esri, HERE, Garmin, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
        </span>
      </div>
    </section>
  );
}
