/**
 * app/a11y/[siteId]/_PublicStatementView.tsx
 *
 * The visitor-facing presentation of an owner's accessibility statement — the
 * page a merchant links from their footer (`accessibilityStatementUrl`). It is a
 * STANDALONE document: it brings its own minimal, readable styling and does NOT
 * depend on the dashboard chrome or any auth.
 *
 * It is a tiny PURE presentational component (no data fetching, no client state)
 * so it can be render-tested in jsdom. The owning RSC (`page.tsx`) does the
 * service-role read + `notFound()` and hands the already-escaped html string in.
 *
 * SECURITY: `html` is owner-authored and was XSS-escaped at generation time by
 * `lib/statement.ts#generateStatementHtml` (the five HTML-significant chars are
 * replaced there). It is the ONLY field the public surface exposes. We render it
 * via `dangerouslySetInnerHTML` exactly as the dashboard preview does.
 *
 * HONESTY (CLAUDE.md compliance guardrail): this view adds NO compliance /
 * "certified" / "ADA-guaranteed" copy of its own — only a neutral frame. The
 * statement body itself is guarded against those phrases by the generator.
 */

/** Minimal, self-contained styling for the standalone document. */
const STYLE = `
  .a11y-public { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1a2233; line-height: 1.65; font-size: 16px; }
  .a11y-public h1, .a11y-public h2 { font-weight: 700; color: #0d1b4d; line-height: 1.25; }
  .a11y-public h1 { font-size: 26px; margin: 0 0 4px; }
  .a11y-public h2 { font-size: 21px; margin: 28px 0 10px; }
  .a11y-public p { margin: 0 0 14px; }
  .a11y-public ul { margin: 0 0 14px; padding-left: 22px; }
  .a11y-public li { margin: 0 0 6px; }
  .a11y-public a { color: #1e63ff; }
  .a11y-public .a11y-public__reviewed,
  .a11y-public .accessibility-statement__reviewed { color: #5b6577; font-size: 14px; }
  .a11y-public__foot { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e6e8ef;
    color: #5b6577; font-size: 13px; }
`;

export function PublicStatementView({ html }: { html: string }) {
  return (
    <main className="a11y-public">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      {/*
        dangerouslySetInnerHTML: `html` is owner-authored and already escaped by
        lib/statement.ts#generateStatementHtml. It carries its own <section> +
        heading; we do not add any compliance claim around it.
      */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="a11y-public__foot">
        This statement describes the publisher&apos;s accessibility commitment and contact
        details. It is not a legal certification.
      </p>
    </main>
  );
}
