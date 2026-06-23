/**
 * lib/pdf/render-report.ts — server-only bridge from scan data → PDF bytes.
 *
 * Keeps @react-pdf/renderer (a heavy, Node-only dependency) out of any module
 * that might be pulled into a client bundle. Only the /api/report-pdf route
 * imports this.
 */

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { ReportDocument } from "./ReportDocument";
import { buildReportContent, type ReportPdfInput } from "./report-content";

/** Build the honest content model, then render the branded PDF to a Buffer. */
export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const content = buildReportContent(input);
  // renderToBuffer is typed to take a ReactElement<DocumentProps>. ReportDocument
  // renders a <Document> at runtime (exactly that), but its own props are {content},
  // so the wrapper element's prop shape doesn't structurally match — bridge it.
  const element = createElement(ReportDocument, { content }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}

/** A safe, host-derived filename like `makoya-report-shop-example.pdf`. */
export function reportFilename(url: string): string {
  let host = "site";
  try {
    host = new URL(url).host || host;
  } catch {
    /* keep default */
  }
  const slug = host.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "site";
  return `makoya-report-${slug}.pdf`;
}
