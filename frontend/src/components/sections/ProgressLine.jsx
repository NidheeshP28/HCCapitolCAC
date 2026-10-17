import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// A line along the top edge that energizes as you scroll down the page.
export default function ProgressLine() {
  const ref = useRef(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(ref.current.firstElementChild, { scaleX: 0 }, { scaleX: 1, ease: "none", transformOrigin: "0 50%", scrollTrigger: { start: 0, end: "max", scrub: 0.25 } });
    },
    { scope: ref }
  );
  return (
    <div className="progress" ref={ref} aria-hidden="true"><i /></div>
  );
}
