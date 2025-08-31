// web/app/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

/** ---------- brand tokens (inline) ---------- */
const brand = {
  colors: {
    bg: "#0B0E12",
    panel: "#121721",
    text: "#E5ECF4",
    subtext: "#9FB3C8",
    primary: "#6EE7F9",
    primaryAlt: "#22D3EE",
    accent: "#A78BFA",
    success: "#34D399",
    warn: "#FBBF24",
    error: "#F87171",
    border: "#1F2A3A",
  },
  radii: { xs: "6px", sm: "10px", md: "14px", lg: "18px" },
  shadow: "0 8px 28px rgba(0,0,0,0.35)",
  font: {
    base: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", Arial, sans-serif`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
  },
};

/** ---------- tiny inline components ---------- */
function BrandLogo({ size = 56 }: { size?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <Image
        src="/brand/cerberus-logo-secondary.png"
        alt="Cerberus"
        width={size}
        height={size}
        priority
      />
      <span
        style={{
          fontSize: size * 0.45,
          fontWeight: 800,
          letterSpacing: 0.5,
          color: brand.colors.text,
          lineHeight: 1,
        }}
      >
        Cerberus
      </span>
    </div>
  );
}

function StatusBanner({
  kind,
  message,
}: {
  kind: "idle" | "loading" | "success" | "warn" | "error";
  message: string;
}) {
  const color =
    kind === "success"
      ? brand.colors.success
      : kind === "warn"
      ? brand.colors.warn
      : kind === "error"
      ? brand.colors.error
      : brand.colors.subtext;

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: brand.radii.sm,
        border: `1px solid ${brand.colors.border}`,
        background: brand.colors.panel,
        color,
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

function ConnectWalletButton() {
  // Placeholder until we wire wallet adapter
  const [connected, setConnected] = useState(false);
  return (
    <button
      onClick={() => setConnected((v) => !v)}
      style={{
        borderRadius: 999,
        padding: "10px 16px",
        border: `1px solid ${brand.colors.border}`,
        background: connected ? brand.colors.accent : brand.colors.primary,
        color: "#0B0E12",
        fontWeight: 700,
      }}
    >
      {connected ? "Wallet Connected (mock)" : "Connect Wallet"}
    </button>
  );
}

/** ---------- page ---------- */

const IN_SOL = "So11111111111111111111111111111111111111112";
const OUT_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

type QuoteResp = {
  outAmount?: string;
  routePlan?: Array<{ swapInfo?: { label?: string } }>;
  message?: string;
};

export default function Page() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
    "https://cerberus-telegram-bot-tutorial.onrender.com";

  const [amountLamports, setAmountLamports] = useState("1000000"); // 0.001 SOL
  const [slipBps, setSlipBps] = useState("50");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [res, setRes] = useState<QuoteResp | null>(null);

  const routeLabels = useMemo(() => {
    if (!res?.routePlan) return [];
    return res.routePlan
      .map((r) => r?.swapInfo?.label)
      .filter(Boolean) as string[];
  }, [res]);

  const onQuote = async () => {
    try {
      setStatus("loading");
      setRes(null);
      const url = `${apiBase}/order?inputMint=${IN_SOL}&outputMint=${OUT_USDC}&amount=${encodeURIComponent(
        amountLamports
      )}&slippageBps=${encodeURIComponent(slipBps)}`;
      const r = await fetch(url);
      const j = (await r.json()) as QuoteResp;
      if (!r.ok) throw new Error(j?.message || "Quote failed");
      setRes(j);
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setRes({ message: e?.message || "Unknown error" });
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: brand.colors.bg,
        color: brand.colors.text,
        fontFamily: brand.font.base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          background: brand.colors.panel,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radii.lg,
          boxShadow: brand.shadow,
          padding: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <BrandLogo size={48} />
          <ConnectWalletButton />
        </header>

        <p style={{ color: brand.colors.subtext, marginBottom: 18 }}>
          Non-custodial swaps on Solana via Jupiter v6. This mini-app calls your
          proxy API to fetch quotes and will later build, sign, and send.
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: 14,
              background: "#0E131C",
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radii.md,
            }}
          >
            <label style={{ fontSize: 13, color: brand.colors.subtext }}>
              Amount (lamports, SOL in)
            </label>
            <input
              value={amountLamports}
              onChange={(e) => setAmountLamports(e.target.value)}
              placeholder="1000000"
              inputMode="numeric"
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: brand.radii.sm,
                border: `1px solid ${brand.colors.border}`,
                background: brand.colors.panel,
                color: brand.colors.text,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              padding: 14,
              background: "#0E131C",
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radii.md,
            }}
          >
            <label style={{ fontSize: 13, color: brand.colors.subtext }}>
              Slippage (bps)
            </label>
            <input
              value={slipBps}
              onChange={(e) => setSlipBps(e.target.value)}
              placeholder="50"
              inputMode="numeric"
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: brand.radii.sm,
                border: `1px solid ${brand.colors.border}`,
                background: brand.colors.panel,
                color: brand.colors.text,
                outline: "none",
              }}
            />
          </div>
        </section>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <button
            onClick={onQuote}
            disabled={status === "loading"}
            style={{
              padding: "12px 16px",
              borderRadius: brand.radii.md,
              background:
                status === "loading" ? brand.colors.primaryAlt : brand.colors.primary,
              color: "#0B0E12",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
            }}
          >
            {status === "loading" ? "Fetching Quote…" : "Get Quote"}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatusBanner
            kind={
              status === "error"
                ? "error"
                : status === "success"
                ? "success"
                : status === "loading"
                ? "loading"
                : "idle"
            }
            message={
              status === "error"
                ? res?.message || "Something went wrong"
                : status === "success"
                ? "Quote ready"
                : status === "loading"
                ? "Talking to Jupiter…"
                : "Idle"
            }
          />
        </div>

        {res && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginTop: 6,
            }}
          >
            <div
              style={{
                padding: 14,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radii.md,
                background: "#0E131C",
              }}
            >
              <div style={{ fontSize: 13, color: brand.colors.subtext }}>
                Expected Out (USDC, 6dp)
              </div>
              <div
                style={{
                  fontFamily: brand.font.mono,
                  marginTop: 6,
                  fontSize: 18,
                }}
              >
                {res?.outAmount ?? "—"}
              </div>
            </div>
            <div
              style={{
                padding: 14,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radii.md,
                background: "#0E131C",
              }}
            >
              <div style={{ fontSize: 13, color: brand.colors.subtext }}>
                Route
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: brand.font.mono,
                  fontSize: 14,
                }}
              >
                {routeLabels.length ? routeLabels.join(" → ") : "—"}
              </div>
            </div>
          </section>
        )}

        <footer style={{ marginTop: 18, color: brand.colors.subtext }}>
          <div style={{ fontSize: 12 }}>
            API base:&nbsp;<code style={{ fontFamily: brand.font.mono }}>{apiBase}</code>
          </div>
        </footer>
      </div>
    </main>
  );
}
