'use client';

import { motion, useReducedMotion } from 'framer-motion';

const easePremium = [0.22, 1, 0.36, 1] as const;

/** Gentle entrance on first paint — keeps hero copy feeling composed. */
export function HeroReveal({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className="md-hero-copy">{children}</div>;
  }

  return (
    <motion.div
      className="md-hero-copy"
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, ease: easePremium }}
    >
      {children}
    </motion.div>
  );
}
