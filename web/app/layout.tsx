import "./globals.css";
import "../src/styles/brand.css";
import type { Metadata, Viewport } from "next";
import Providers from "./providers"; // ✅ add this

export const viewport: Viewport = {
  themeColor: "#0B0E12",
};

export const metadata: Metadata = {
  title: "Cerberus",
  description: "Safe Solana swaps. Your keys, your control.",
  icons: {
    icon: [
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/brand/cbrs-16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/cbrs-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/cbrs-48.png", type: "image/png", sizes: "48x48" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        {/* ✅ Wallets + connection + modal are provided app-wide here */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
