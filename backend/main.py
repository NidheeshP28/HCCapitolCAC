import json
from functools import lru_cache
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).parent
DIST = BASE.parent / "frontend" / "dist"

app = FastAPI(title="GridAid")


@app.get("/api/health")
def health():
    return {"ok": True}


@lru_cache(maxsize=1)
def _data():
    return json.loads((BASE / "data.json").read_text())


@app.get("/api/data")
def data():
    return _data()


@app.get("/api/compare")
def compare(county: str, k: int = 5, radius: float | None = None, methods: str | None = None):
    """Run every placement algorithm on one county; exact_milp only where scipy is installed."""
    from fastapi import HTTPException
    from optimizer import ALGORITHMS, Problem, compare as run
    c = _data()["counties"].get(county)
    if c is None or not 1 <= k <= 40:
        raise HTTPException(404 if c is None else 422, "unknown county" if c is None else "k must be 1 to 40")
    names = [m for m in (methods.split(",") if methods else ALGORITHMS) if m in ALGORITHMS]
    return {"county": county, "k": k, "radius": radius or c["R"], "results": run(Problem.from_county(c, radius or c["R"], k), names)}


# Production: serve the built React app from the same server.
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
