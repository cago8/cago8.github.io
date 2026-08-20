'use client';

import { useState, type FormEvent } from 'react';
import { site, socialLinks, formSubmitAjaxUrl } from '../../config/site';

/** FormSubmit's AJAX endpoint keeps this working from a fully static export. */
export function ContactCard() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch(formSubmitAjaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('rejected');
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  return (
    <article className="card card--contact">
      <p className="card-meta">Email</p>
      <p className="contact-email">
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>

      <p className="card-meta">Elsewhere</p>
      <ul className="contact-links">
        {socialLinks.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span>
            </a>
          </li>
        ))}
        <li>
          <a href={site.resume} target="_blank" rel="noopener noreferrer">
            <span>Résumé</span>
            <span className="handle">PDF</span>
          </a>
        </li>
      </ul>

      <form className="contact-form" onSubmit={handleSubmit}>
        <p className="card-meta">Send a message</p>
        <div className="field-row">
          <label>
            <span>Name</span>
            <input type="text" name="name" required autoComplete="name" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>
        </div>
        <label>
          <span>Message</span>
          <textarea name="message" rows={4} required />
        </label>
        <button type="submit" className="btn btn--solid" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <p className="form-status" role="status">
          {status === 'sent' && 'Sent — thanks, I will get back to you.'}
          {status === 'error' && `Something went wrong. Please email ${site.email} directly.`}
        </p>
      </form>
    </article>
  );
}
