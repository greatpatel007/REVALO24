"""Visual hotspot test - step 2: predicted-attention analysis.

Reads the screenshots + conversion-target boxes produced by capture.mjs,
computes a predicted human-attention (saliency) map per screenshot, renders
heatmap overlays and scores how much attention each conversion target gets.

Backend:
  - DeepGaze IIE (research-grade gaze prediction) when torch + deepgaze_pytorch
    are importable, otherwise
  - an OpenCV ensemble tuned for UI screenshots: spectral-residual +
    fine-grained saliency, gaze-spread blur and a center-weighted viewing prior
    (first-view attention is strongly center-biased; contrast/faces/text pop).

Outputs to ./output: <shot>-heat.png overlays and report.md.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np

OUT = Path(__file__).parent / "output"

# ---------------------------------------------------------------- backends
BACKEND = "opencv-ensemble"
try:  # optional research-grade upgrade; falls back silently
    import torch  # noqa: F401
    import deepgaze_pytorch  # noqa: F401

    BACKEND = "deepgaze-iie"
except ImportError:
    pass


def saliency_deepgaze(img_bgr: np.ndarray) -> np.ndarray:
    import torch
    from deepgaze_pytorch import DeepGazeIIE

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = DeepGazeIIE(pretrained=True).to(device)
    h, w = img_bgr.shape[:2]
    # centerbias: log-density prior, use a generic gaussian one
    yy, xx = np.mgrid[0:h, 0:w]
    cb = -(((xx - w / 2) / (0.35 * w)) ** 2 + ((yy - h / 2) / (0.35 * h)) ** 2)
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    image_t = torch.tensor(rgb.transpose(2, 0, 1)[None]).float().to(device)
    cb_t = torch.tensor(cb[None]).float().to(device)
    with torch.no_grad():
        log_density = model(image_t, cb_t)
    sal = np.exp(log_density.cpu().numpy()[0, 0])
    return sal / sal.sum()


def saliency_ensemble(img_bgr: np.ndarray) -> np.ndarray:
    h, w = img_bgr.shape[:2]

    sr = cv2.saliency.StaticSaliencySpectralResidual_create()
    ok1, sal_sr = sr.computeSaliency(img_bgr)
    fg = cv2.saliency.StaticSaliencyFineGrained_create()
    ok2, sal_fg = fg.computeSaliency(img_bgr)
    if not (ok1 and ok2):
        raise RuntimeError("OpenCV saliency failed (is opencv-contrib-python installed?)")

    def norm(m: np.ndarray) -> np.ndarray:
        m = m.astype(np.float64)
        rng = m.max() - m.min()
        return (m - m.min()) / rng if rng > 0 else np.zeros_like(m)

    sal = 0.6 * norm(sal_sr) + 0.4 * norm(sal_fg)

    # gaze spread: foveal blur, sigma ~2% of the diagonal
    sigma = 0.02 * math.hypot(w, h)
    sal = cv2.GaussianBlur(sal, (0, 0), sigma)

    # center-weighted viewing prior (slightly above geometric center)
    yy, xx = np.mgrid[0:h, 0:w]
    prior = np.exp(-(((xx - 0.5 * w) / (0.42 * w)) ** 2 + ((yy - 0.45 * h) / (0.42 * h)) ** 2))
    sal = norm(sal) * (0.35 + 0.65 * prior)

    total = sal.sum()
    return sal / total if total > 0 else sal


def overlay(img_bgr: np.ndarray, sal: np.ndarray) -> np.ndarray:
    s = sal / sal.max() if sal.max() > 0 else sal
    heat = cv2.applyColorMap((s * 255).astype(np.uint8), cv2.COLORMAP_JET).astype(np.float64)
    alpha = (0.68 * s)[..., None]
    return (img_bgr.astype(np.float64) * (1 - alpha) + heat * alpha).astype(np.uint8)


def top_hotspots(sal: np.ndarray, n: int = 5) -> list[tuple[int, int, float]]:
    """Iterative peak picking with local suppression -> [(x, y, peak_strength)]."""
    h, w = sal.shape
    work = sal.copy()
    radius = int(0.12 * min(w, h))
    peaks: list[tuple[int, int, float]] = []
    for _ in range(n):
        _, mx, _, loc = cv2.minMaxLoc(work)
        if mx <= 0:
            break
        peaks.append((loc[0], loc[1], float(mx)))
        cv2.circle(work, loc, radius, 0, -1)
    return peaks


def analyze(shot: Path) -> dict | None:
    meta_path = shot.with_suffix(".json")
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    img = cv2.imread(str(shot))
    if img is None:
        return None

    sal = saliency_deepgaze(img) if BACKEND == "deepgaze-iie" else saliency_ensemble(img)
    cv2.imwrite(str(shot.with_name(shot.stem + "-heat.png")), overlay(img, sal))

    h, w = sal.shape
    total_area = w * h
    targets = []
    for t in meta["targets"]:
        share = float(sal[t["y"] : t["y"] + t["h"], t["x"] : t["x"] + t["w"]].sum()) * 100
        area_pct = (t["w"] * t["h"]) / total_area * 100
        lift = share / area_pct if area_pct > 0 else 0.0
        targets.append({**t, "share": share, "areaPct": area_pct, "lift": lift})

    def label(x: int, y: int) -> str:
        for t in meta["targets"]:
            if t["x"] <= x <= t["x"] + t["w"] and t["y"] <= y <= t["y"] + t["h"]:
                return t["name"]
        return "-"

    peaks = [{"x": x, "y": y, "at": label(x, y)} for x, y, _ in top_hotspots(sal)]
    return {"shot": shot.stem, "url": meta["url"], "targets": targets, "peaks": peaks}


def main() -> None:
    shots = sorted(p for p in OUT.glob("*.png") if not p.stem.endswith("-heat"))
    if not shots:
        raise SystemExit(f"no screenshots in {OUT} - run capture.mjs first")

    results = [r for r in (analyze(s) for s in shots) if r]

    lines = [
        "# Visual hotspot report",
        "",
        f"Backend: **{BACKEND}** · {len(results)} screenshots",
        "",
        "`share` = % of total predicted attention inside the element. `lift` = share relative to",
        "the element's area (>1 = hotter than average pixel, <1 = colder). Primary CTAs with",
        "lift < 1.0 are flagged **COLD**.",
        "",
    ]
    for r in results:
        lines += [f"## {r['shot']}", "", f"{r['url']}", "", "| target | share | area | lift | verdict |", "|---|---|---|---|---|"]
        for t in r["targets"]:
            verdict = "**COLD**" if t["lift"] < 1.0 else ("HOT" if t["lift"] >= 2.0 else "warm")
            lines.append(f"| {t['name']} | {t['share']:.1f}% | {t['areaPct']:.1f}% | {t['lift']:.2f}x | {verdict} |")
        peak_txt = ", ".join(f"({p['x']},{p['y']}) on {p['at']}" for p in r["peaks"])
        lines += ["", f"Top hotspots: {peak_txt}", ""]

    report = OUT / "report.md"
    report.write_text("\n".join(lines), encoding="utf-8")
    print(f"backend: {BACKEND}")
    for r in results:
        flags = [t["name"] for t in r["targets"] if t["lift"] < 1.0]
        print(f"  {r['shot']}: " + (f"COLD -> {', '.join(flags)}" if flags else "all targets warm/hot"))
    print(f"report -> {report}")


if __name__ == "__main__":
    main()
