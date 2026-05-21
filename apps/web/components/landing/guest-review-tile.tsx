'use client';

import { useId, useRef, type ReactNode } from 'react';

const READ_MORE_MIN_CHARS = 118;

type Props = {
  header: ReactNode;
  guestLabel: string;
  /** e.g. city — shown under the name when present */
  sublabel?: string | null;
  body: string;
  /** Optional anchor on the all-reviews page */
  reviewAnchorId?: string;
};

/**
 * Compact landing review card: excerpt + “Read more” opens a native dialog with the full quote.
 */
export function GuestReviewTile({ header, guestLabel, sublabel, body, reviewAnchorId }: Props) {
  const dialogId = useId();
  const dlgRef = useRef<HTMLDialogElement>(null);
  const text = body.trim();
  const showReadMore = text.length > READ_MORE_MIN_CHARS;

  function open() {
    dlgRef.current?.showModal();
  }

  function close() {
    dlgRef.current?.close();
  }

  return (
    <>
      <div className="md-review-card-top">{header}</div>
      <div className="md-review-tile-quote-wrap">
        <p className="md-review-tile-excerpt">{`"${text}"`}</p>
      </div>
      <div className="md-review-tile-footer">
        <div>
          <p className="md-reviewer">{guestLabel}</p>
          {sublabel ? <p className="md-reviewer-loc">{sublabel}</p> : null}
        </div>
        {showReadMore ? (
          <button type="button" className="md-review-tile-more" onClick={open}>
            Read more
          </button>
        ) : null}
      </div>

      <dialog ref={dlgRef} id={dialogId} className="md-review-read-dialog" aria-labelledby={`${dialogId}-title`}>
        <div className="md-review-read-dialog-inner">
          <div className="md-review-read-dialog-head">
            <p id={`${dialogId}-title`} className="md-review-read-dialog-title">
              Guest quote
            </p>
            <button type="button" className="md-review-read-dialog-close" onClick={close} aria-label="Close">
              ×
            </button>
          </div>
          <blockquote className="md-review-read-dialog-quote">
            <p>{`"${text}"`}</p>
          </blockquote>
          <p className="md-review-read-dialog-by">
            {guestLabel}
            {sublabel ? <span className="md-review-read-dialog-sublabel"> · {sublabel}</span> : null}
          </p>
          {reviewAnchorId ? (
            <p className="md-review-read-dialog-hint">
              <a href={`/guest-reviews#${reviewAnchorId}`} className="md-link" onClick={close}>
                Open on all reviews page
              </a>
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
