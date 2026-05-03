"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { FormEvent, useState, useRef } from "react";
import { FaCodepen, FaGithub, FaInstagram, FaLinkedin, FaReddit, FaXTwitter } from "react-icons/fa6";
import { IoMailOutline } from "react-icons/io5";
import { SiGmail } from "react-icons/si";
import ContactCard from "./ContactCard";
import { formSubmitAjaxUrl, site } from "../config/site";

const FORM_ENDPOINT = formSubmitAjaxUrl;

type ContactFormValues = {
  senderName: string;
  senderEmail: string;
  reasonToContact: string;
  senderMessage: string;
};

const socials = [
  { label: "GitHub", href: site.social.github, Icon: FaGithub },
  { label: "LinkedIn", href: site.social.linkedin, Icon: FaLinkedin },
  { label: "Mail", href: `mailto:${site.email}`, Icon: SiGmail },
  { label: "Instagram", href: site.social.instagram, Icon: FaInstagram },
  { label: "X", href: site.social.x, Icon: FaXTwitter },
  { label: "Reddit", href: site.social.reddit, Icon: FaReddit },
];

export default function Contact() {
  const ref = useRef<HTMLElement | null>(null);
  const [formValues, setFormValues] = useState<ContactFormValues>({
    senderName: "",
    senderEmail: "",
    reasonToContact: "General Inquiry",
    senderMessage: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isInView = useInView(ref, {
    once: false,
    margin: "-80px",
    amount: 0.1,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;

    setIsSending(true);
    setIsSent(false);
    setErrorMessage("");

    try {
      const payload = new FormData();
      payload.append("name", formValues.senderName);
      payload.append("email", formValues.senderEmail);
      payload.append("_replyto", formValues.senderEmail);
      payload.append("_subject", `Portfolio Contact: ${formValues.reasonToContact}`);
      payload.append("message", formValues.senderMessage);
      payload.append("_captcha", "false");
      payload.append("_template", "table");

      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to send your message. Please try again.");
      }

      setIsSent(true);
      setFormValues({
        senderName: "",
        senderEmail: "",
        reasonToContact: "General Inquiry",
        senderMessage: "",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${error.message} If this keeps happening, use the Direct Mail link below.`
          : "Something went wrong while sending. Please use the Direct Mail link below."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleFieldChange = (field: keyof ContactFormValues, value: string) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }));
  };

  return (
    <section
      ref={ref}
      id="connect"
      className="relative mx-auto w-full max-w-7xl overflow-hidden px-6 py-24 sm:px-10 lg:px-14"
    >
      <motion.div
        className="mb-14 text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h2 className="font-heading text-5xl font-bold text-brand-primary sm:text-6xl">Let&apos;s Connect</h2>
        <p className="mx-auto mt-4 max-w-3xl font-body text-sm text-slate-300">
          Happy to talk about Java and design patterns, Flutter and mobile, AI/ML, DevOps, open
          source, or collaborative projects—reach out via the form or any link below.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -26 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-brand-primary/25 bg-slate-950/45 p-6 shadow-soft-deeper backdrop-blur-xl"
        >
          <h3 className="font-heading text-2xl font-semibold text-slate-100">Send a Message</h3>
          <p className="mt-2 font-body text-sm text-slate-300">Your message is sent through a static-friendly form provider.</p>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <input
              required
              type="text"
              value={formValues.senderName}
              onChange={(event) => handleFieldChange("senderName", event.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl border border-brand-primary/25 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-primary/60"
            />

            <input
              required
              type="email"
              value={formValues.senderEmail}
              onChange={(event) => handleFieldChange("senderEmail", event.target.value)}
              placeholder="Your Email"
              className="w-full rounded-xl border border-brand-primary/25 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-primary/60"
            />

            <label htmlFor="reasonToContact" className="sr-only">
              Reason to Contact
            </label>

            <select
              id="reasonToContact"
              name="reasonToContact"
              title="Reason to Contact"
              aria-label="Reason to Contact"
              value={formValues.reasonToContact}
              onChange={(event) => handleFieldChange("reasonToContact", event.target.value)}
              className="w-full rounded-xl border border-brand-primary/25 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-primary/60"
            >
              <option>General Inquiry</option>
              <option>Project Collaboration</option>
              <option>Internship Opportunity</option>
              <option>Feedback</option>
            </select>

            <textarea
              required
              rows={4}
              value={formValues.senderMessage}
              onChange={(event) => handleFieldChange("senderMessage", event.target.value)}
              placeholder="Your Message"
              className="w-full resize-none rounded-xl border border-brand-primary/25 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-primary/60"
            />

            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center justify-center rounded-full border border-brand-primary/45 bg-brand-primary/10 px-5 py-2.5 font-body text-sm text-slate-100 transition hover:bg-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send Message"}
            </button>
          </form>

          {isSent && <p className="mt-3 text-sm text-emerald-300">Message sent successfully.</p>}
          {errorMessage && <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 26 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl border border-brand-primary/25 bg-slate-950/45 p-6 shadow-soft-deeper backdrop-blur-xl"
        >
          <h3 className="font-heading text-2xl font-semibold text-slate-100">Socials</h3>
          <p className="mt-2 font-body text-sm text-slate-300">Find me on the platforms below.</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {socials.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-primary/35 bg-brand-primary/10 px-4 py-2 font-body text-sm text-slate-100 transition hover:bg-brand-primary/20"
                data-cursor="disable"
              >
                <Icon className="h-4 w-4 text-brand-primary" />
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-5">
            <ContactCard
              icon={IoMailOutline}
              label="Direct Mail"
              value={site.email}
              href={`mailto:${site.email}`}
              delay={0.2}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
