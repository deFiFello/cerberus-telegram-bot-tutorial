// web/app/page.tsx
'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';

/* ============================ Brand ============================ */

const brand = {
  colors: {
    bg: '#0B0E12',
    panel: '#121721',
    text: '#E5ECF4',
    subtext: '#9FB3C8',
    primary: '#6EE7F9',
    primaryAlt: '#22D3EE',
    accent: '#A78BFA',
    success: '#34D399',
    warn: '#FBBF24',
    error: '#F87171',
    border: '#1F2A3A',
  },
  radii: { xs: '6px', sm: '10px', md: '14px', lg: '18px' },
  shadow: '0 8px 28px rgba(0,0,0,0.35)',
  font: {
    base: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", Arial, sans-serif`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
  },
};

function BrandLogo({ size = 56 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <Image
        src="/brand/cerberus-logo-primary.png"
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
  children,
}: {
  kind: 'idle' | 'loading' | 'success' | 'warn' | 'error';
  children: React.ReactNode;
}) {
  const color =
    kind === 'success'
      ? brand.colors.success
      : kind === 'warn'
      ? brand.colors.warn
      : kind === 'error'
      ? brand.colors.error
      : brand.colors.subtext;

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: brand.radii.sm,
        border: `1px solid ${brand.colors.border}`,
        background: brand.colors.panel,
        color,
        fontSize: 14,
        wordBreak: 'break-word',
      }}
    >
      {children}
    </div>
  );
}

/* ============================ Types ============================ */

const IN_SOL = 'So11111111111111111111111111111111111111112';
const OUT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

type QuoteResp = {
  outAmount?: string;
  routePlan?: Array<{ swapInfo?: { label?: string } }>;
  message?: string;
};

type BuildTxResp = {
  /** Jupiter commonly returns one or more of these. We will IGNORE any *signed* variant. */
  tx?: string; // base64 unsigned
  transaction?: string; // base64 unsigned
  swapTransaction?: string; // base64 unsigned (preferred)
  signedTransaction?: string; // base64 signed (we do not use)
  message?: string;
};

/* ============================ Helpers ============================ */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || `HTTP ${res.status}` };
  }
}

function pickUnsignedTx(j: BuildTxResp): string | null {
  // Prefer the canonical unsigned field names; explicitly ignore `signedTransaction`.
  return j.swapTransaction || j.tx || j.transaction || null;
}

/* ============================ Page ============================ */

export default function Page() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
    'https://cerberus-telegram-bot-tutorial.onrender.com';

  const [amountLamports, setAmountLamports] = useState('1000000'); // 0.001 SOL
  const [slipBps, setSlipBps] = useState('50');

  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [quote, setQuote] = useState<QuoteResp | null>(null);

  const [txPhase, setTxPhase] = useState<'idle' | 'building' | 'sending' | 'confirming' | 'ok' | 'fail'>('idle');
  const [txMsg, setTxMsg] = useState<string>('');
  const [sig, setSig] = useState<string | null>(null);

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const validInputs =
    /^\d+$/.test(amountLamports) && Number(amountLamports) > 0 && /^\d+$/.test(slipBps);

  const routeLabels = useMemo(() => {
    if (!quote?.routePlan) return [];
    return quote.routePlan.map((r) => r?.swapInfo?.label).filter(Boolean) as string[];
  }, [quote]);

  const formattedOut = useMemo(() => {
    if (!quote?.outAmount) return null;
    const v = Number(quote.outAmount) / 10 ** USDC_DECIMALS;
    if (!Number.isFinite(v)) return null;
    return v.toLocaleString(undefined, { maximumFractionDigits: USDC_DECIMALS });
  }, [quote?.outAmount]);

  /* -------------------- Quote -------------------- */
  const onQuote = async () => {
    try {
      setQuoteStatus('loading');
      setQuote(null);

      const url = new URL('/order', apiBase);
      url.searchParams.set('inputMint', IN_SOL);
      url.searchParams.set('outputMint', OUT_USDC);
      url.searchParams.set('amount', amountLamports);
      url.searchParams.set('slippageBps', slipBps);

      const r = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      const j = (await parseJsonSafe(r)) as QuoteResp;

      if (!r.ok) throw new Error(j?.message || `Quote failed (HTTP ${r.status})`);

      setQuote(j);
      setQuoteStatus('success');
    } catch (e: any) {
      setQuote({ message: e?.message || 'Quote error' });
      setQuoteStatus('error');
    }
  };

  /* -------------------- Build & Sign -------------------- */
  const onBuildAndSign = async () => {
    setTxPhase('idle');
    setTxMsg('');
    setSig(null);

    try {
      if (!connected || !publicKey) {
        setTxPhase('fail');
        setTxMsg('Connect a wallet first.');
        return;
      }
      if (!validInputs) {
        setTxPhase('fail');
        setTxMsg('Enter a valid lamports amount and slippage.');
        return;
      }

      setTxPhase('building');
      setTxMsg('Building transaction via API…');

      const url = new URL('/order', apiBase);
      url.searchParams.set('inputMint', IN_SOL);
      url.searchParams.set('outputMint', OUT_USDC);
      url.searchParams.set('amount', amountLamports);
      url.searchParams.set('slippageBps', slipBps);
      url.searchParams.set('buildTx', 'true');
      url.searchParams.set('userPublicKey', publicKey.toBase58());

      const r = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      const j = (await parseJsonSafe(r)) as BuildTxResp;

      if (!r.ok) throw new Error(j?.message || `Build failed (HTTP ${r.status})`);

      // **IMPORTANT**: Only accept UNSIGNED tx from the API.
      const txB64 = pickUnsignedTx(j);
      if (!txB64) {
        // If server ever returns only signed, refuse it to avoid mobile wallet errors
        throw new Error(
          'API returned a pre-signed transaction; a wallet must sign & send. (unsigned tx not found)'
        );
      }

      // Deserialize the unsigned transaction for the adapter to sign+send
      const raw = b64ToBytes(txB64);
      const tx = VersionedTransaction.deserialize(raw);

      setTxPhase('sending');
      setTxMsg('Requesting wallet signature…');

      // Adapter handles base58 signature encoding for us
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });

      setTxPhase('confirming');
      setTxMsg('Awaiting confirmation…');

      // Confirm with latest blockhash (v1 wallets are ok with this)
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        'confirmed'
      );

      setSig(signature);
      setTxPhase('ok');
      setTxMsg('Sent ✓');
    } catch (e: any) {
      // Normalize a few common wallet/server messages to something friendly
      const m = String(e?.message || e || 'Transaction failed');
      let friendly = m;

      if (/invalid signature format/i.test(m) || /must be base58/i.test(m)) {
        friendly =
          'Wallet returned an invalid signature format. This usually means the API returned a pre-signed transaction. We only accept unsigned tx for the wallet to sign.';
      } else if (/user rejected|user denied|rejected/i.test(m)) {
        friendly = 'You rejected the request in your wallet.';
      }

      setTxPhase('fail');
      setTxMsg(friendly);
      console.error('[build&sign]', e);
    }
  };

  /* -------------------- Render -------------------- */
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: brand.colors.bg,
        color: brand.colors.text,
        fontFamily: brand.font.base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <BrandLogo size={48} />
          <div style={{ display: 'inline-flex' }}>
            <WalletMultiButton />
          </div>
        </header>

        <p style={{ color: brand.colors.subtext, marginBottom: 18 }}>
          Non-custodial swaps on Solana via Jupiter v6. This mini-app calls your proxy API to fetch
          quotes and can build a transaction for your wallet to sign.
        </p>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: 14,
              background: '#0E131C',
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
                width: '100%',
                padding: '10px 12px',
                borderRadius: brand.radii.sm,
                border: `1px solid ${brand.colors.border}`,
                background: brand.colors.panel,
                color: brand.colors.text,
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              padding: 14,
              background: '#0E131C',
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radii.md,
            }}
          >
            <label style={{ fontSize: 13, color: brand.colors.subtext }}>Slippage (bps)</label>
            <input
              value={slipBps}
              onChange={(e) => setSlipBps(e.target.value)}
              placeholder="50"
              inputMode="numeric"
              style={{
                marginTop: 8,
                width: '100%',
                padding: '10px 12px',
                borderRadius: brand.radii.sm,
                border: `1px solid ${brand.colors.border}`,
                background: brand.colors.panel,
                color: brand.colors.text,
                outline: 'none',
              }}
            />
          </div>
        </section>

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <button
            onClick={onQuote}
            disabled={quoteStatus === 'loading' || !validInputs}
            style={{
              padding: '12px 16px',
              borderRadius: brand.radii.md,
              background:
                quoteStatus === 'loading' || !validInputs
                  ? brand.colors.primaryAlt
                  : brand.colors.primary,
              color: '#0B0E12',
              fontWeight: 800,
              border: 'none',
              cursor: quoteStatus === 'loading' || !validInputs ? 'not-allowed' : 'pointer',
            }}
            title={!validInputs ? 'Enter a valid lamports amount & slippage' : 'Get a quote'}
          >
            {quoteStatus === 'loading' ? 'Fetching Quote…' : 'Get Quote'}
          </button>

          <button
            onClick={onBuildAndSign}
            disabled={
              !connected || !validInputs || txPhase === 'building' || txPhase === 'sending' || txPhase === 'confirming'
            }
            style={{
              padding: '12px 16px',
              borderRadius: brand.radii.md,
              background:
                !connected ||
                !validInputs ||
                txPhase === 'building' ||
                txPhase === 'sending' ||
                txPhase === 'confirming'
                  ? brand.colors.primaryAlt
                  : brand.colors.accent,
              color: '#0B0E12',
              fontWeight: 800,
              border: 'none',
              cursor: !connected || !validInputs ? 'not-allowed' : 'pointer',
            }}
            title={
              !connected
                ? 'Connect a wallet first'
                : !validInputs
                ? 'Enter a valid lamports amount & slippage'
                : 'Build and sign the swap'
            }
          >
            {txPhase === 'building'
              ? 'Building…'
              : txPhase === 'sending'
              ? 'Signing…'
              : txPhase === 'confirming'
              ? 'Confirming…'
              : 'Build & Sign'}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatusBanner
            kind={
              quoteStatus === 'error'
                ? 'error'
                : quoteStatus === 'success'
                ? 'success'
                : quoteStatus === 'loading'
                ? 'loading'
                : 'idle'
            }
          >
            {quoteStatus === 'error'
              ? quote?.message || 'Something went wrong'
              : quoteStatus === 'success'
              ? 'Quote ready'
              : quoteStatus === 'loading'
              ? 'Talking to Jupiter…'
              : 'Idle'}
          </StatusBanner>
        </div>

        {quote && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginTop: 6,
            }}
          >
            <div
              style={{
                padding: 14,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radii.md,
                background: '#0E131C',
              }}
            >
              <div style={{ fontSize: 13, color: brand.colors.subtext }}>
                Expected Out (USDC)
              </div>
              <div
                style={{
                  fontFamily: brand.font.mono,
                  marginTop: 6,
                  fontSize: 18,
                }}
              >
                {formattedOut ?? '—'}
              </div>
            </div>
            <div
              style={{
                padding: 14,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radii.md,
                background: '#0E131C',
              }}
            >
              <div style={{ fontSize: 13, color: brand.colors.subtext }}>Route</div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: brand.font.mono,
                  fontSize: 14,
                }}
              >
                {routeLabels.length ? routeLabels.join(' → ') : '—'}
              </div>
            </div>
          </section>
        )}

        {txPhase !== 'idle' && (
          <div style={{ marginTop: 12 }}>
            <StatusBanner
              kind={
                txPhase === 'ok' ? 'success' : txPhase === 'fail' ? 'error' : 'loading'
              }
            >
              {txMsg}
            </StatusBanner>

            {sig && (
              <div style={{ marginTop: 8, fontSize: 12, color: brand.colors.subtext }}>
                <a
                  href={`https://solscan.io/tx/${sig}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: brand.colors.primary }}
                >
                  View on Solscan
                </a>
              </div>
            )}
          </div>
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
