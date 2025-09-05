import "./globals.css";
import "../src/styles/brand.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  // Single color for the browser UI
  themeColor: "#0B0E12",
  // If you want dynamic colors later, use:
  // themeColor: [
  //   { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  //   { media: "(prefers-color-scheme: dark)",  color: "#0B0E12" }
  // ],
};

export const metadata: Metadata = {
  title: "Cerberus",
  description: "Safe Solana swaps. Your keys, your control.",
  icons: {
    icon: [
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },

      // colored square favicons
      { url: "/brand/cbrs-16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/cbrs-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/cbrs-48.png", type: "image/png", sizes: "48x48" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
