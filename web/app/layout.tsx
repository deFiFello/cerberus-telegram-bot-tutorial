// web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cerberus",
  description:
    "Cerberus — non-custodial swaps on Solana (Telegram Mini App + Jupiter v6).",
  icons: {
    icon: [
      { url: "/brand/cerberus-favicon.ico", type: "image/x-icon", rel: "icon" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/brand/cerberus-logo-primary.png" }],
  },
  applicationName: "Cerberus",
  themeColor: "#0B0E12",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
