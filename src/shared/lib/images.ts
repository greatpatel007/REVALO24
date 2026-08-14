/**
 * Build responsive Unsplash (or compatible) srcset by rewriting `w=` / `q=`.
 * Non-Unsplash URLs return undefined srcSet so callers keep a single src.
 */
export function listingImageSrc(url: string, width = 640, quality = 60): string {
  if (!url.includes("images.unsplash.com")) return url;
  let next = url.includes("w=") ? url.replace(/([?&])w=\d+/, `$1w=${width}`) : `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
  next = next.includes("q=") ? next.replace(/([?&])q=\d+/, `$1q=${quality}`) : `${next}&q=${quality}`;
  return next;
}

/** Card thumbs: 320 for phones-in-grid, 480/640 for 2–3 cols — avoid 800 default. */
export function listingImageSrcSet(
  url: string,
  widths: number[] = [320, 480, 640],
): string | undefined {
  if (!url.includes("images.unsplash.com")) return undefined;
  return widths.map((w) => `${listingImageSrc(url, w)} ${w}w`).join(", ");
}

/** Shell ~1280; 4-col ≈280px, 3-col ≈33vw, 2-col ≈45vw — keep picks under 640w. */
export const LISTING_THUMB_SIZES =
  "(min-width: 1536px) 280px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw";
