import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Loads the slim `domAnimation` feature set once (not the full motion tree).
 * `reducedMotion="user"` disables / softens animations when the OS asks for it.
 */
export function LazyMotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
