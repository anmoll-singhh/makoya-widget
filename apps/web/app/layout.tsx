import "./globals.css";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Newsreader } from "next/font/google";
import { PostHogProvider } from "./posthog-provider";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Makoya — find what's turning visitors away, and fix it",
  description:
    "An honest accessibility scan: a real 0–100 score and the exact issues on your site, in plain English. No 'instant compliance' lies.",
};

// Mobile-first viewport (block 26). `viewport-fit=cover` lets the safe-area
// insets in globals.css take effect on notched phones. `maximumScale` is left
// unset so users can always pinch-zoom (WCAG 1.4.4 — never disable zoom).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D1B4D",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${newsreader.variable}`}
    >
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
