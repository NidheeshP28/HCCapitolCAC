import { useMemo } from "react";
import { buildDistances, evaluatePlan, getCurve, minCenters, minReach } from "./plan.js";
import { useDebounced } from "./hooks.js";

export const KMIN = 3;
export const KMAX = 25;        // plans for more than KPRE centers are computed live in the browser
export const KPRE = 10;        // largest budget with a precomputed plan (and a robust plan)
export const RMIN = 0.25, RMAX = 60;       // reach slider, miles, log scale
export const TARGETS = [80, 90, 95];

export const rToT = (r) => Math.max(0, Math.min(100, (100 * Math.log(r / RMIN)) / Math.log(RMAX / RMIN)));
export const tToR = (t) => RMIN * Math.pow(RMAX / RMIN, t / 100);
export const niceR = (r) => (r < 2 ? Math.round(r * 20) / 20 : r < 10 ? Math.round(r * 10) / 10 : Math.round(r * 2) / 2);

export function usePlan({ data, fips, k, radius, mode }) {
  const county = data && fips ? data.counties[fips] ?? null : null;
  const R = county ? radius ?? county.R : 0;
  const atDefault = !county || radius == null || Math.abs(radius - county.R) < 1e-9;
  const pre = county && atDefault && k <= KPRE ? county.k[String(k)] ?? null : null;
  const live = !!county && !pre;

  const D = useMemo(() => (county ? buildDistances(county) : null), [county]);
  const curve = useMemo(() => (county && D ? getCurve(county, D, R) : null), [county, D, R]);
  const livePlan = useMemo(() => {
    if (!live || !D) return null;
    const sel = curve.sel.slice(0, k);
    return { sel, gains: curve.gains.slice(0, k), ...evaluatePlan(county, D, sel, R, Number(fips) || 0) };
  }, [live, D, curve, county, R, k, fips]);

  const countyHasRobust = !!county && Array.isArray(county.k[String(KPRE)]?.rsel);
  const hasRobust = !!pre && Array.isArray(pre.rsel);
  const robust = mode === "robust" && hasRobust;

  const plan = useMemo(() => {
    if (!county || !D) return null;
    let v;
    if (pre && robust)
      v = { sel: pre.rsel, gains: pre.rgains, unc: pre.runc, cov: pre.rcov, red: pre.rred, exp: pre.rexp, lo: pre.rlo, hi: pre.rhi };
    else if (pre)
      v = { sel: pre.sel, gains: county.gains.slice(0, pre.sel.length), unc: pre.unc, cov: pre.cov, red: pre.red, exp: pre.exp, lo: pre.lo, hi: pre.hi };
    else if (livePlan) v = { ...livePlan, unc: livePlan.unc };
    else return null;
    const { zips } = county, Z = zips.length;
    const tot = county.total || 1;
    let run = 0;
    const chosen = v.sel.map((si, i) => {
      run += v.gains?.[i] ?? 0;
      return { ...county.sites[si], idx: si, n: i + 1, gain: v.gains?.[i] ?? 0, cum: Math.min(100, (100 * run) / tot) };
    });
    // nearest planned center per ZIP, straight line from the ZIP's representative point
    const nearN = new Int16Array(Z), nearD = new Float64Array(Z);
    for (let z = 0; z < Z; z++) {
      let best = Infinity, bi = 0;
      for (let i = 0; i < v.sel.length; i++) {
        const d = D[v.sel[i] * Z + z];
        if (d < best) { best = d; bi = i; }
      }
      nearN[z] = bi + 1;
      nearD[z] = best;
    }
    const opt = pre?.opt ?? null;
    return {
      ...v,
      chosen,
      uncovered: new Set(v.unc),
      nearN, nearD,
      opt,
      ratio: opt ? Math.min(100, (100 * v.cov) / opt) : null,
      source: pre ? (robust ? "robust" : "phased") : "live",
    };
  }, [county, D, pre, robust, livePlan]);

  // "budget needed" and "reach needed" are many greedy runs; wait for the slider to settle before computing them
  const kSettled = useDebounced(k, 140);
  const needs = useMemo(() => {
    if (!county || !D || !curve) return null;
    return TARGETS.map((t) => ({
      target: t,
      centers: minCenters(curve, t),
      reach: minReach(county, D, kSettled, t),
    }));
  }, [county, D, curve, kSettled]);

  return { county, R, atDefault, pre, live, D, curve, plan, countyHasRobust, hasRobust, robust, needs };
}

