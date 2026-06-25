import "./globals.css";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import { PostHogProvider } from "./posthog-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Makoya — turn an inaccessible site into customers",
  description:
    "Find exactly what's turning visitors away, fix it, and stop losing customers to a site they can't use.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
