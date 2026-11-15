import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { ThemeScript } from "@/components/shell/theme-toggle";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { template: "%s · Prompt Force", default: "Prompt Force" },
  description: "Logg mat og trening på ett sted.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by ThemeScript before paint, so the server markup differs.
    <html lang="nb" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
