"use client";

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import ExperienceCard from './ExperienceCard';
import { experienceData } from './experienceData';

export default function Experience() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, {
    once: false,
    margin: '-80px',
    amount: 0.1,
  });

  return (
    <section
      ref={ref}
      id="experience"
      className="relative mx-auto w-full max-w-6xl overflow-hidden px-6 py-20 sm:px-10 lg:px-14"
    >
      <motion.div
        className="mb-14 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.h2
          className="font-heading text-4xl font-bold text-brand-primary sm:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Experience
        </motion.h2>
      </motion.div>

      <div className="relative">
        <motion.div
          className="absolute left-3 top-2 hidden w-px bg-gradient-to-b from-brand-primary/60 via-brand-secondary/40 to-transparent md:block"
          style={{ height: `${experienceData.length * 280}px` }}
          initial={{ scaleY: 0, originY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1.1, delay: 0.3 }}
        />

        <div className="space-y-10">
          {experienceData.map((item, index) => (
            <ExperienceCard key={`${item.company}-${index}`} index={index} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
