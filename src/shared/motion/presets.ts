import type { Transition, Variants } from "motion/react";

/** Snappy, short — keeps main-thread work small on marketing surfaces. */
export const easeOut: Transition = {
  duration: 0.4,
  ease: [0.2, 0, 0, 1],
};

export const staggerFast: Transition = {
  staggerChildren: 0.06,
  delayChildren: 0.04,
};

/** Hero / section intro: fade + slight rise. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

/** Parent that staggers `fadeUp` children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: staggerFast },
};

/** In-view reveal for cards / feature tiles (once). */
export const revealInView: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

export const inViewOnce = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -32px 0px",
} as const;
