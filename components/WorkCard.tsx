"use client";

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { FaGithub } from 'react-icons/fa6';
import type { WorkItem } from './workData';

const SUMMARY_URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:)\]'»]+$/u, '');
}

/** Turns raw https URLs in plain-text summaries into clickable links. */
function linkifySummary(text: string): ReactNode[] {
  const parts = text.split(SUMMARY_URL_REGEX);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      const href = stripTrailingPunctuation(part);
      const trailing = part.slice(href.length);
      return (
        <span key={`url-${index}`}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-secondary underline decoration-brand-secondary/40 underline-offset-[3px] transition hover:text-brand-primary hover:decoration-brand-primary"
            data-cursor="disable"
          >
            {href}
          </a>
          {trailing}
        </span>
      );
    }
    return part.length > 0 ? <span key={`txt-${index}`}>{part}</span> : null;
  });
}

type WorkCardProps = {
  item: WorkItem;
  index: number;
};

export default function WorkCard({ item, index }: WorkCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateCanHover = () => setCanHover(mediaQuery.matches);

    updateCanHover();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateCanHover);
      return () => mediaQuery.removeEventListener('change', updateCanHover);
    }

    mediaQuery.addListener(updateCanHover);
    return () => mediaQuery.removeListener(updateCanHover);
  }, []);

  const enableHoverEffects = canHover && !shouldReduceMotion;

  const isInView = useInView(ref, {
    once: true,
    margin: '-50px',
    amount: 0.2,
  });

  const isGithub = useMemo(() => Boolean(item.link?.includes('github.com')), [item.link]);
  const linkLabel = useMemo(() => (isGithub ? 'Code' : 'View'), [isGithub]);
  const summaryContent = useMemo(() => linkifySummary(item.summary), [item.summary]);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={
        enableHoverEffects
          ? {
              y: -10,
              scale: 1.02,
              transition: {
                duration: 0.3,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              },
            }
          : undefined
      }
      className="group relative flex h-[580px] w-[min(76vw,340px)] min-w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-brand-primary/25 bg-slate-950/40 p-3 shadow-soft-deeper backdrop-blur-xl sm:h-[620px]"
    >
      {enableHoverEffects && (
        <motion.div
          className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-30"
          style={{ background: 'var(--shimmer)' }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      )}

      {enableHoverEffects && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(129, 140, 248, 0.2), rgba(59, 130, 246, 0.16))',
            filter: 'blur(1px)',
          }}
        />
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <motion.div
          className="mb-3 flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-primary/35 bg-slate-950 sm:h-40"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.45, delay: index * 0.1 + 0.15 }}
        >
          <div className="relative h-full w-full">
            <Image
              src={item.imageUrl}
              alt={`${item.title} preview image`}
              fill
              sizes="(max-width: 640px) 76vw, 340px"
              className="object-contain object-center"
              priority={index < 2}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
          </div>
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <span className="inline-flex w-fit shrink-0 rounded-full border border-brand-secondary/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-brand-secondary">
            Project {String(index + 1).padStart(2, '0')}
          </span>

          <motion.h3
            className="shrink-0 font-heading text-xl font-bold leading-tight text-brand-primary sm:text-[1.35rem]"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
          >
            {item.title}
          </motion.h3>

          <motion.p
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain font-body text-[13px] leading-snug text-slate-200 pr-1 [-webkit-overflow-scrolling:touch] sm:text-sm sm:leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
          >
            {summaryContent}
          </motion.p>

          <motion.div
            className="flex max-h-[3.75rem] shrink-0 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.4 }}
          >
            {item.technologies.map((techItem, techIndex) => (
              <motion.span
                key={`${item.title}-tech-${techIndex}`}
                className="rounded-md border border-brand-primary/35 bg-brand-primary/10 px-2 py-0.5 text-[11px] text-slate-200 sm:text-xs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.5 + techIndex * 0.05, type: 'spring', stiffness: 300 }}
                whileHover={enableHoverEffects ? { scale: 1.05 } : undefined}
              >
                {techItem}
              </motion.span>
            ))}
          </motion.div>

          {item.link ? (
            <motion.div
              className="mt-auto shrink-0 self-start pb-1 pt-1"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.6 }}
            >
              <motion.a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-auto items-center justify-center gap-2 rounded-full border border-brand-primary/45 bg-brand-primary/10 px-3 py-1.5 font-body text-xs text-slate-100 transition hover:bg-brand-primary/20"
                whileHover={enableHoverEffects ? { scale: 1.02 } : undefined}
                whileTap={{ scale: 0.98 }}
              >
                {isGithub && <FaGithub className="h-4 w-4" />}
                {linkLabel}
              </motion.a>
            </motion.div>
          ) : (
            <div className="mt-auto shrink-0 pb-1 pt-1" aria-hidden />
          )}
        </div>
      </div>
    </motion.article>
  );
}
