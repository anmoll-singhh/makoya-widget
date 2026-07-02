/**
 * lib/pdf/render-audit.ts — server-only bridge from AuditReportContent → PDF bytes.
 *
 * Keeps @react-pdf/renderer (a heavy, Node-only dependency — externalised in
 * next.config so its font metrics survive bundling) out of any client module.
 * Only the /api/sites/[id]/audit-pdf route imports this.
 */

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { hostSlug } from "@/lib/utils/url";
import { AuditDocument } from "./AuditDocument";
import type { AuditReportContent } from "@/lib/audit/audit-content";

/** Render the branded Full Audit PDF to a Buffer. */
export async function renderAuditPdf(content: AuditReportContent): Promise<Buffer> {
  const element = createElement(AuditDocument, { content }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}

/** A safe, host-derived filename like `makoya-full-audit-shop.example.pdf`. */
export function auditFilename(url: string): string {
  return `makoya-full-audit-${hostSlug(url)}.pdf`;
}
