'use client';

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const easePremium = [0.22, 1, 0.36, 1] as const;

/** Props Framer attaches that must not leak onto plain DOM elements when reduced-motion. */
const MOTION_ONLY_PROP_KEYS = new Set<string>([
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'layoutRoot',
  'initial',
  'animate',
  'exit',
  'variants',
  'transition',
  'custom',
  'inherit',
  'whileHover',
  'whileTap',
  'whileDrag',
  'whileFocus',
  'whileInView',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragPropagation',
  'dragSnapToOrigin',
  'dragTransitions',
  'dragTransition',
  'dragDirectionLock',
  'dragListeners',
  'viewport',
  'onHoverStart',
  'onHoverEnd',
  'onTap',
  'onTapCancel',
  'onTapStart',
  'onPan',
  'onPanStart',
  'onPanEnd',
  'onPanSessionStart',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onViewportEnter',
  'onViewportLeave',
  'transformTemplate',
  'transformValues',
  'onLayoutAnimationComplete',
  'onLayoutAnimationStart',
]);

function stripMotionOnlyProps(rest: Record<string, unknown>): Record<string, unknown> {
  const dom: Record<string, unknown> = { ...rest };
  for (const key of MOTION_ONLY_PROP_KEYS) {
    delete dom[key];
  }
  return dom;
}

type SectionMotionProps = ComponentPropsWithoutRef<typeof motion.section>;
type Props = Omit<SectionMotionProps, 'transition' | 'children'> & {
  delay?: number;
  children?: ReactNode;
};

/** Scroll-in section: fade + lift. Respects prefers-reduced-motion. */
export function RevealSection({ children, className, id, style, delay = 0, ...rest }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    const domRest = stripMotionOnlyProps(rest as Record<string, unknown>);
    return (
      <section
        id={id}
        className={className}
        style={style as CSSProperties | undefined}
        {...(domRest as ComponentPropsWithoutRef<'section'>)}
      >
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.75, delay, ease: easePremium }}
      {...rest}
    >
      {children}
    </motion.section>
  );
}

type ArticleMotionProps = ComponentPropsWithoutRef<typeof motion.article>;
type ArticleProps = Omit<ArticleMotionProps, 'transition' | 'children'> & {
  delayIndex: number;
  children?: ReactNode;
};

export function RevealArticle({ delayIndex, children, className, style, ...rest }: ArticleProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const domRest = stripMotionOnlyProps(rest as Record<string, unknown>);
    return (
      <article
        className={className}
        style={style as CSSProperties | undefined}
        {...(domRest as ComponentPropsWithoutRef<'article'>)}
      >
        {children}
      </article>
    );
  }

  return (
    <motion.article
      className={className}
      style={style}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: delayIndex * 0.06, ease: easePremium }}
      {...rest}
    >
      {children}
    </motion.article>
  );
}

type FigMotionProps = ComponentPropsWithoutRef<typeof motion.figure>;
type FigProps = Omit<FigMotionProps, 'transition' | 'children'> & {
  delayIndex: number;
  children?: ReactNode;
};

export function RevealFigure({ delayIndex, children, className, style, ...rest }: FigProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const domRest = stripMotionOnlyProps(rest as Record<string, unknown>);
    return (
      <figure
        className={className}
        style={style as CSSProperties | undefined}
        {...(domRest as ComponentPropsWithoutRef<'figure'>)}
      >
        {children}
      </figure>
    );
  }

  return (
    <motion.figure
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, delay: delayIndex * 0.05, ease: easePremium }}
      {...rest}
    >
      {children}
    </motion.figure>
  );
}

type DivMotionProps = ComponentPropsWithoutRef<typeof motion.div>;
type DivProps = Omit<DivMotionProps, 'transition' | 'children'> & {
  delayIndex?: number;
  children?: ReactNode;
};

/** Staggered block for feature grids and rules. */
export function RevealBlock({ delayIndex = 0, children, className, style, ...rest }: DivProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const domRest = stripMotionOnlyProps(rest as Record<string, unknown>);
    return (
      <div
        className={className}
        style={style as CSSProperties | undefined}
        {...(domRest as ComponentPropsWithoutRef<'div'>)}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.52, delay: delayIndex * 0.05, ease: easePremium }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
