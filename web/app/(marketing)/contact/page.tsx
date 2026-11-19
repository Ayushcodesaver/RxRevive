"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Sparkles, Target, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { contactSchema, type ContactInput } from "@/lib/validation/schemas";
import { sendContact } from "@/lib/api/client";

export default function ContactPage() {
  const [status, setStatus] = useState<{ text: string; kind: "" | "error" | "ok" }>({ text: "", kind: "" });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(input: ContactInput) {
    setStatus({ text: "Sending…", kind: "" });
    try {
      const response = await sendContact(input);
      setStatus({ text: response.data.message, kind: "ok" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "The message could not be sent.", kind: "error" });
    }
  }

  return (
    <>
      <PageHeader
        title="Contact the Team"
        subtitle="Questions, feedback or collaboration: send the RxRevive team a message. No personal contact details are invented here."
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Send the team a message</h2>
            <p>Messages land in the project database for the team to read.</p>
          </div>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "var(--gap-columns)", alignItems: "start" }}>
            <div className="well contact-info" style={{ display: "grid", gap: "var(--space-md)" }}>
              <h3 className="card-title"><Sparkles size={20} aria-hidden="true" /> About RxRevive</h3>
              <p>An academic final-year project: one matching problem, two engines run on identical inputs.</p>
              <h3 className="card-title"><User size={20} aria-hidden="true" /> The team</h3>
              <p><strong>Team RxRevive</strong> covers NLP research, backend engineering, frontend and UX, and documentation roles.</p>
              <h3 className="card-title"><Target size={20} aria-hidden="true" /> Project purpose</h3>
              <p>Built for learning, demonstration and academic evaluation. All match scores are educational suggestions, never automated hiring decisions.</p>
            </div>
            <div className="well contact-form-card">
              <h3 className="card-title"><FileText size={20} aria-hidden="true" /> Feedback &amp; contact form</h3>
              <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "grid", gap: "var(--space-md)" }}>
                <div className="two-inputs">
                  <div>
                    <label className="field-label" htmlFor="contact-name">Name</label>
                    <input type="text" id="contact-name" maxLength={120} {...register("name")} aria-invalid={Boolean(errors.name)} />
                    {errors.name ? <p className="form-status error">{errors.name.message}</p> : null}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="contact-email">Email</label>
                    <input type="email" id="contact-email" maxLength={255} {...register("email")} aria-invalid={Boolean(errors.email)} />
                    {errors.email ? <p className="form-status error">{errors.email.message}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="contact-subject">Subject <span className="muted">(optional)</span></label>
                  <input type="text" id="contact-subject" maxLength={200} {...register("subject")} />
                </div>
                <div>
                  <label className="field-label" htmlFor="contact-message">Message</label>
                  <textarea id="contact-message" rows={6} {...register("message")} aria-invalid={Boolean(errors.message)} />
                  {errors.message ? <p className="form-status error">{errors.message.message}</p> : null}
                </div>
                <div className="form-actions">
                  <button className="btn" type="submit" disabled={isSubmitting}>Send Message</button>
                  <p className="form-status" role="status" aria-live="polite">{status.text}</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
