"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { IconType } from "react-icons";

type ContactCardProps = {
  icon: IconType;
  label: string;
  value: string;
  href?: string;
  delay?: number;
};

export default function ContactCard({ icon: Icon, label, value, href, delay = 0 }: ContactCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group flex items-center gap-4 rounded-2xl border border-brand-primary/25 bg-slate-950/45 p-4 shadow-soft-deeper backdrop-blur-xl"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/35 bg-brand-primary/10">
        <Icon className="h-5 w-5 text-brand-primary" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-0.5 font-body text-base text-slate-100 transition group-hover:text-brand-primary">{value}</p>
      </div>
    </motion.div>
  );

  if (href) {
    const isExternalHttp = href.startsWith("http");
    return (
      <Link
        href={href}
        target={isExternalHttp ? "_blank" : undefined}
        rel={isExternalHttp ? "noopener noreferrer" : undefined}
      >
        {content}
      </Link>
    );
  }

  return content;
}
