"use client";

import { useState } from "react";
import { IconClose } from "./Icons";

type ReportProblemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
};

export function ReportProblemModal({
  isOpen,
  onClose,
  productId,
  productTitle,
}: ReportProblemModalProps) {
  const [kind, setKind] = useState<"mismatch" | "stale_price" | "other">("mismatch");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          kind,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit report");
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setNote("");
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting report");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report a data problem"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              FEEDBACK
            </span>
            <h3 className="font-bold text-lg text-ink">Report a problem</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-black/5"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green/10 text-green text-xl font-bold">
              ✓
            </span>
            <p className="font-semibold text-text text-base">Report received</p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Thank you for keeping our matching catalog accurate and trustworthy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-muted">
              Reporting on: <strong className="text-text">{productTitle}</strong>
            </p>

            <div>
              <label htmlFor="report-kind" className="block text-xs font-semibold text-text mb-1">
                Issue kind
              </label>
              <select
                id="report-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="mismatch">Product mismatch (different shoes merged)</option>
                <option value="stale_price">Stale or incorrect price</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="report-note" className="block text-xs font-semibold text-text">
                  Details (optional)
                </label>
                <span className="font-mono text-[10px] text-muted">
                  {note.length}/500
                </span>
              </div>
              <textarea
                id="report-note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What looks incorrect about this product or offer?"
                className="w-full rounded-lg border border-border bg-bg p-2.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error ? (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

