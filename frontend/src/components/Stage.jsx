import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ShapeGrid from "./reactbits/ShapeGrid.jsx";
import { LogoRise } from "./ui/Logo.jsx";
import Planner from "./Planner.jsx";
import { useMotionMode } from "../lib/hooks.js";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NAV = [
  ["#why", "Why"],
  ["#how", "How it works"],
  ["#limits", "Limits"],
  ["#data", "Data"],
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

      // where the collapsed map window sits: centred on the stage, as wide as ~a third of it
      const geo = () => {
        const W = stage.clientWidth, H = stage.clientHeight;
        const ww = Math.min(Math.max(W * 0.34, 380), 600);
        const s = ww / cell.offsetWidth;
        return {
          s,
          x: W / 2 - (cell.offsetLeft + cell.offsetWidth / 2),
          y: H * 0.54 - (cell.offsetTop + cell.offsetHeight / 2),
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
        { scale: () => geo().s, x: () => geo().x, y: () => geo().y, "--bw": "5px" },
        { scale: 1, x: 0, y: 0, "--bw": "1px", ease: "power2.inOut", duration: 1 },
        0
      )
        .to(q(".hero-logo"), { y: -110, scale: 0.86, autoAlpha: 0, ease: "power2.in", duration: 0.75 }, 0)
        .to(q(".fx-out"), { autoAlpha: 0, y: -18, duration: 0.3, stagger: 0.03, ease: "power1.out" }, 0)
        .to(q(".stage-grid"), { opacity: 0.45, duration: 1.2 }, 0)
        .fromTo(docks("top"), { autoAlpha: 0, y: -34 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.05, ease: "power3.out" }, 0.62)
        .fromTo(docks("right"), { autoAlpha: 0, x: 44 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.07, ease: "power3.out" }, 0.7)
        .fromTo(docks("bottom"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.04, ease: "power3.out" }, 0.78)
        .to({}, { duration: HOLD });                      // hold: everything has docked, the planner stays put while it is used
      total = tl.duration();

      // a keyboard user tabbing into a card that is still sliding in gets the finished layout
      const onFocus = () => {
        const st = stRef.current;
        if (st && st.progress * total < total - HOLD) window.scrollTo(0, st.start + ((total - HOLD) / total) * (st.end - st.start));
      };
      planner.addEventListener("focusin", onFocus);
      return () => {
        planner.removeEventListener("focusin", onFocus);
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
      <ShapeGrid
        className="stage-grid"
        shape="square"
        cellSize={46}
        lineWidth={1}
        lineColor="rgba(20,24,27,0.085)"
        hoverColor="#e0431b"
        hoverFillColor="#e0431b"
        fillOpacity={0.16}
        direction="none"
        speed={0}
        radius={1.8}
        trail={0.9}
        glow={0}
        fade={0}
        paused={open}
      />

      <div className="stage-hero">

        <h1 className="hero-logo"><LogoRise /></h1>

        <div className="hero-lead-wrap fx-out">
          <p className="hero-lead fx-in">
            By: Aaron Qin, Hardy Wang, Anay Sura, Nideesh Pusuluri <br />
            For Capitol 2026
          </p>
        </div>
      </div>

      <Planner />
    </section>
  );
}
