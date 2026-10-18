import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Galaxy from "./reactbits/Galaxy.jsx";
import ShapeGrid from "./reactbits/ShapeGrid.jsx";
import { LogoRise } from "./ui/Logo.jsx";
import Rocket, { PAD, PLUME } from "./ui/Rocket.jsx";
import Planner from "./Planner.jsx";
import { useMotionMode } from "../lib/hooks.js";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NAV = [
  ["#data", "Join us"],
];

export default function Stage() {
  const stageRef = useRef(null);
  const stRef = useRef(null);
  const mode = useMotionMode();
  const [open, setOpen] = useState(mode !== "pin");

  useGSAP(
    () => {
      const stage = stageRef.current;
      const q = gsap.utils.selector(stage);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        gsap.from(q(".lg-ch"), { yPercent: 115, duration: 1.1, ease: "power4.out", stagger: 0.06, delay: 0.1 });
        gsap.from(q(".fx-in"), { autoAlpha: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.07, delay: 0.55 });
      }
      if (mode !== "pin") {
        q(".planner")[0].inert = false;
        setOpen(true);
        return;
      }

      const cell = q("[data-map-cell]")[0];
      const planner = q(".planner")[0];
      planner.inert = true;
      setOpen(false);

      // where the collapsed map window sits: centred on the stage, a little over a third as wide, and a whole number of
      // grid squares wide and tall so its edges run along grid lines. The count of squares is picked so the window keeps
      // the map's shape; the tiny remaining difference is taken up by scaling width and height separately (under 3%).
      const SQ = 46;                   // the grid's square, px (ShapeGrid cellSize)
      const geo = () => {
        const W = stage.clientWidth, H = stage.clientHeight, cw = cell.offsetWidth, ch = cell.offsetHeight, r = ch / cw;
        const want = Math.min(Math.max(W * 0.38, 420), 680) / SQ;
        let best = null;
        for (let a = Math.max(4, Math.round(want) - 2); a <= Math.round(want) + 2; a++) {
          const b = Math.max(2, Math.round(a * r)), err = Math.abs(b / (a * r) - 1) + Math.abs(a - want) * 0.004;
          if (!best || err < best.err) best = { a, b, err };
        }
        const w = best.a * SQ, h = best.b * SQ;
        return {
          sx: w / cw, sy: h / ch, w, h,
          x0: W / 2 - w / 2, y0: H * 0.54 - h / 2,
          x: W / 2 - (cell.offsetLeft + cw / 2),
          y: H * 0.54 - (cell.offsetTop + ch / 2),
        };
      };

      const docks = (name) => q(`[data-dock="${name}"]`);
      const HOLD = 0.55;               // the planner stays pinned and fully open this long (in timeline units) so it can be used
      let total = 1.95;                // real value is read from the timeline once it is built
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 1.05 * total)}`,
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress * total;
            const live = t >= 0.7;                       // cards are on their way in: let them take focus
            if (planner.inert === live) planner.inert = !live;
            const done = t >= total - HOLD - 0.05;
            if (stage.dataset.open !== (done ? "1" : "0")) setOpen(done);
          },
        },
      });
      stRef.current = tl.scrollTrigger;

      tl.fromTo(
        cell,
        { scaleX: () => geo().sx, scaleY: () => geo().sy, x: () => geo().x, y: () => geo().y, "--bw": "5px", borderColor: "#14181b" },
        { scaleX: 1, scaleY: 1, x: 0, y: 0, "--bw": "1px", borderColor: "rgba(0,0,0,0.12)", ease: "power2.inOut", duration: 1 },
        0
      )
        .to(q(".hero-logo"), { y: -110, scale: 0.86, autoAlpha: 0, ease: "power2.in", duration: 0.75 }, 0)
        .to(q(".fx-out"), { autoAlpha: 0, y: -18, duration: 0.3, stagger: 0.03, ease: "power1.out" }, 0)
        // the black sky opens outward from the map as it grows, so the galaxy melts into the white page (stage.css mask)
        // at rest the clear ellipse fits inside the small map window, so the black meets its edges with no glow; it grows
        // well past the screen, so every corner is clear by about two thirds of the way through, not only at the very end
        .fromTo(q(".stage-sky"), {
          "--rx": () => `${Math.floor((geo().w / 2) * 0.98)}px`,
          "--ry": () => `${Math.floor((geo().h / 2) * 0.98)}px`,
        }, {
          "--rx": () => `${Math.round(stage.clientWidth * 3.8)}px`,
          "--ry": () => `${Math.round(stage.clientHeight * 4.1)}px`,
          ease: "power2.inOut", duration: 1,
        }, 0)
        .to(q(".stage-sky"), { autoAlpha: 0, duration: 0.2, ease: "power1.in" }, 0.85)
        .fromTo(docks("top"), { autoAlpha: 0, y: -34 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.05, ease: "power3.out" }, 0.62)
        .fromTo(docks("right"), { autoAlpha: 0, x: 44 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.07, ease: "power3.out" }, 0.7)
        .fromTo(docks("bottom"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.04, ease: "power3.out" }, 0.78);

      // the shuttle lifts off its tower as the map opens; its smoke blows left over the fading logo. All of it is gone
      // before the cards dock, and scrolling back lands it again.
      const launch = q(".launch")[0], smoke = q(".rocket-smoke")[0], logo = q(".hero-logo")[0];
      const lift = () => stage.clientHeight * 1.25 + 100;
      const toLogo = () => ({                             // layout offsets, so the logo's own scroll motion does not move the target
        w: launch.offsetWidth,
        lw: logo.firstElementChild?.offsetWidth ?? 500,
        dx: stage.clientWidth / 2 - (launch.offsetLeft + smoke.offsetLeft),
        dy: logo.offsetTop + logo.offsetHeight / 2 - (launch.offsetTop + smoke.offsetTop),
      });
      const pad = q(".smoke-pad"), plume = q(".smoke-plume");
      gsap.set([...pad, ...plume], { autoAlpha: 0, scale: 0.3, x: 0, y: 0 });
      tl.to(q(".launch-arm"), { rotation: 58, transformOrigin: "100% 50%", duration: 0.07, ease: "power2.inOut" }, 0)
        .fromTo(q(".rocket-flame"), { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.1, ease: "power2.out" }, 0.02)
        .to(q(".rocket-flame"), { scaleY: 1.7, duration: 0.4, ease: "power1.in" }, 0.12)
        .fromTo(q(".rocket-ship"), { y: 0 }, { y: () => -lift(), duration: 0.6, ease: "power2.in" }, 0.08)
        .fromTo(q(".rocket-trail"), { autoAlpha: 0.8, scaleY: 0, height: lift }, { scaleY: 1, height: lift, duration: 0.6, ease: "power2.in" }, 0.08);
      pad.forEach((el, i) => {
        const [fx, fy, s] = PAD[i], at = 0.03 + i * 0.012;
        tl.to(el, { autoAlpha: 0.8, duration: 0.08 }, at)
          .to(el, { x: () => fx * toLogo().w, y: () => fy * toLogo().w, scale: s, duration: 0.4, ease: "power2.out" }, at);
      });
      // each puff rises first and drifts left later (two eases), so the plume bends up and over to the logo
      plume.forEach((el, i) => {
        const [f, u, v, s] = PLUME[i], at = 0.05 + f * 0.13;
        tl.to(el, { autoAlpha: f >= 0.85 ? 0.85 : 0.7, duration: 0.1 }, at)
          .to(el, { y: () => { const g = toLogo(); return f * g.dy + v * g.w * 0.5 * f; }, scale: s, duration: 0.42, ease: "power2.out" }, at)
          .to(el, { x: () => { const g = toLogo(); return f * g.dx + u * g.lw * 0.5 * f * f; }, duration: 0.42, ease: "power1.in" }, at);
      });
      tl.to([...pad, ...plume, ...q(".rocket-trail")], { autoAlpha: 0, duration: 0.2, ease: "power1.in" }, 0.56)
        .to(q(".launch-tower"), { autoAlpha: 0, duration: 0.2, ease: "power1.in" }, 0.5)
        .to(q(".stage-ring"), { autoAlpha: 0, duration: 0.3, ease: "power1.in" }, 0)
        .to({}, { duration: HOLD });                      // hold: everything has docked, the planner stays put while it is used
      total = tl.duration();

      // a ring of lit grid squares around the small map window, as if the cursor were hovering all along its edge. The
      // grid is shifted so its lines run along the window's edges; the ring is two squares wide, brightest at the edge, and
      // its corners round off (distance is measured as a circle, so corner squares farther than two squares stay dark)
      const ring = q(".stage-ring")[0], grid = q(".stage-grid")[0];
      const drawRing = () => {
        const W = stage.clientWidth, H = stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
        ring.width = Math.round(W * dpr);
        ring.height = Math.round(H * dpr);
        const ctx = ring.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const g = geo(), x0 = g.x0, x1 = g.x0 + g.w, y0 = g.y0, y1 = g.y0 + g.h;
        const ox = ((x0 % SQ) + SQ) % SQ, oy = ((y0 % SQ) + SQ) % SQ, BAND = 2;
        Object.assign(grid.style, { left: `${ox - SQ}px`, top: `${oy - SQ}px`, width: `${W + 2 * SQ}px`, height: `${H + 2 * SQ}px` });
        ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = "#ffffff";
        ctx.lineWidth = 1;
        for (let i = Math.round((x0 - ox) / SQ) - BAND - 1; i <= Math.round((x1 - ox) / SQ) + BAND; i++) {
          for (let j = Math.round((y0 - oy) / SQ) - BAND - 1; j <= Math.round((y1 - oy) / SQ) + BAND; j++) {
            const L = ox + i * SQ, T = oy + j * SQ, cx = L + SQ / 2, cy = T + SQ / 2;
            const d = Math.hypot(Math.max(x0 - cx, cx - x1, 0), Math.max(y0 - cy, cy - y1, 0)) / SQ;
            if (d === 0 || d > BAND) continue;                               // under the map, or past the ring
            const v = (1 - (d - 0.5) / BAND) ** 1.3;
            ctx.globalAlpha = 0.05 * v;
            ctx.shadowBlur = 0;
            ctx.fillRect(L + 0.5, T + 0.5, SQ - 1, SQ - 1);
            ctx.globalAlpha = 0.85 * v;
            ctx.shadowBlur = 6.4 * v;
            ctx.strokeRect(L + 0.5, T + 0.5, SQ - 1, SQ - 1);
          }
        }
      };
      drawRing();
      ScrollTrigger.addEventListener("refresh", drawRing);
      // the planner's cards fill in after the data loads, which can change the map's size: measure everything again then
      let resized = 0;
      const ro = new ResizeObserver(() => { clearTimeout(resized); resized = setTimeout(() => ScrollTrigger.refresh(), 120); });
      ro.observe(cell);

      // a keyboard user tabbing into a card that is still sliding in gets the finished layout
      const onFocus = () => {
        const st = stRef.current;
        if (st && st.progress * total < total - HOLD) window.scrollTo(0, st.start + ((total - HOLD) / total) * (st.end - st.start));
      };
      planner.addEventListener("focusin", onFocus);
      return () => {
        planner.removeEventListener("focusin", onFocus);
        ScrollTrigger.removeEventListener("refresh", drawRing);
        ro.disconnect();
        clearTimeout(resized);
        Object.assign(grid.style, { left: "", top: "", width: "", height: "" });
        planner.inert = false;
      };
    },
    { scope: stageRef, dependencies: [mode], revertOnUpdate: true }
  );

  const toPlanner = (e) => {
    if (mode !== "pin" || !stRef.current) return;
    e.preventDefault();
    window.scrollTo({ top: stRef.current.end + 2, behavior: "smooth" });
  };

  return (
    <section className="stage" ref={stageRef} data-motion={mode} data-open={open ? "1" : "0"} aria-label="GridAid planner">
      <div className="stage-hero">
        {/* frozen once the planner is open on the pinned layout: it is hidden then, and clicks belong to the planner */}
        <div className="stage-sky">
          {/* the stars hold still (no speed, drift or spin) but still part around the cursor */}
          <Galaxy
            density={1}
            glowIntensity={0.3}
            flareIntensity={1}
            starSpeed={0}
            speed={0}
            rotationSpeed={0}
            opacity={0.7}
            mouseRepulsion
            clickWarp={false}
            intro={false}
            mouseInteraction={!(mode === "pin" && open)}
            disableAnimation={mode === "pin" && open}
          />
          <ShapeGrid
            className="stage-grid"
            shape="square"
            cellSize={46}
            lineWidth={1}
            lineColor="rgba(255,255,255,0.06)"
            hoverColor="#ffffff"
            hoverFillColor="#ffffff"
            fillOpacity={0.04}
            direction="none"
            speed={0}
            radius={1.8}
            trail={0.9}
            glow={0.4}
            fade={0}
            paused={mode === "pin" && open}
          />
          <canvas className="stage-ring" aria-hidden="true" />
        </div>

        <h1 className="hero-logo"><LogoRise /></h1>

        <div className="hero-lead-wrap fx-out">
          <p className="hero-lead fx-in">
            By: Aaron Qin, Hardy Wang, Anay Sura, Nidheesh Pusuluri <br />
            For Capitol 2026
          </p>
        </div>

        <Rocket />
      </div>

      <Planner />
    </section>
  );
}
