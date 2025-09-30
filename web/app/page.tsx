'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';

/* ----------------------- brand tokens (inline) ----------------------- */
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

/* ----------------------- tiny inline components ---------------------- */
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
  message,
}: {
  kind: 'idle' | 'loading' | 'success' | 'warn' | 'error';
  message: string;
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
      {message}
    </div>
  );
}

/* ----------------------- constants & types --------------------------- */

const IN_SOL = 'So11111111111111111111111111111111111111112';
const OUT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

type QuoteResp = {
  outAmount?: string; // integer string (smallest units)
  routePlan?: Array<{ swapInfo?: { label?: string } }>;
  message?: string;
};

type BuildTxResp = {
  tx?: string;
  transaction?: string;
  swapTransaction?: string;
  signedTransaction?: string;
  message?: string;
};

/* ----------------------- utils -------------------------------------- */

// browser-safe base64 -> Uint8Array
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// best-effort JSON parse that preserves server text errors
async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/* ----------------------- page --------------------------------------- */

export default function Page() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
    'https://cerberus-telegram-bot-tutorial.onrender.com';

  const [amountLamports, setAmountLamports] = useState('1000000'); // 0.001 SOL
  const [slipBps, setSlipBps] = useState('50');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [res, setRes] = useState<QuoteResp | null>(null);

  const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'sending' | 'ok' | 'fail'>('idle');
  const [txError, setTxError] = useState<string>('');
  const [sig, setSig] = useState<string | null>(null);

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();

  const routeLabels = useMemo(() => {
    if (!res?.routePlan) return [];
    return res.routePlan.map((r) => r?.swapInfo?.label).filter(Boolean) as string[];
  }, [res]);

  const validInputs =
    /^\d+$/.test(amountLamports) && Number(amountLamports) > 0 && /^\d+$/.test(slipBps);

  const onQuote = async () => {
    try {
      setStatus('loading');
      setRes(null);

      const url = new URL('/order', apiBase);
      url.searchParams.set('inputMint', IN_SOL);
      url.searchParams.set('outputMint', OUT_USDC);
      url.searchParams.set('amount', amountLamports);
      url.searchParams.set('slippageBps', slipBps);

      const r = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      const j = (await parseJsonSafe(r)) as QuoteResp;

      if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);

      setRes(j);
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setRes({ message: e?.message || 'Unknown error' });
    }
  };

  const onBuildAndSign = async () => {
    try {
      if (!connected || !publicKey) {
        setTxStatus('fail');
        setTxError('Connect a wallet first.');
        return;
      }
      if (!validInputs) {
        setTxStatus('fail');
        setTxError('Enter a valid lamports amount and slippage.');
        return;
      }

      setTxStatus('building');
      setTxError('');
      setSig(null);

      const url = new URL('/order', apiBase);
      url.searchParams.set('inputMint', IN_SOL);
      url.searchParams.set('outputMint', OUT_USDC);
      url.searchParams.set('amount', amountLamports);
      url.searchParams.set('slippageBps', slipBps);
      url.searchParams.set('buildTx', 'true');
      url.searchParams.set('userPublicKey', publicKey.toBase58());

      const r = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      const j = (await parseJsonSafe(r)) as BuildTxResp;

      if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);

      const txB64 =
        j.tx || j.swapTransaction || j.transaction || j.signedTransaction || '';
      if (!txB64) throw new Error('Missing transaction in API response');

      const raw = b64ToBytes(txB64);
      const tx = VersionedTransaction.deserialize(raw);

      setTxStatus('sending');

      let signature: string | null = null;

      try {
        // primary path: adapter handles sign & send
        signature = await sendTransaction(tx, connection, {
          skipPreflight: false,
          maxRetries: 3,
        });
      } catch (primaryErr: any) {
        // fallback: sign locally (if available) then send ourselves
        if (typeof signTransaction === 'function') {
          try {
            const signed = await signTransaction(tx);
            signature = await connection.sendRawTransaction(signed.serialize(), {
              skipPreflight: false,
              maxRetries: 3,
            });
          } catch (fallbackErr: any) {
            throw fallbackErr;
          }
        } else {
          throw primaryErr;
        }
      }

      if (!signature) throw new Error('Failed to obtain transaction signature');

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
      setTxStatus('ok');
    } catch (e: any) {
      console.error('build/sign error', e);
      // trim very technical messages
      const msg = String(e?.message || e || 'Transaction failed')
        .replace(/^Error:\s*/i, '')
        .replace(/signature must be base58 encoded:.*/i, 'Wallet returned an invalid signature format.');
      setTxError(msg);
      setTxStatus('fail');
    }
  };

  const formattedOut = useMemo(() => {
    if (!res?.outAmount) return null;
    const v = Number(res.outAmount) / 10 ** USDC_DECIMALS;
    if (!Number.isFinite(v)) return null;
    return v.toLocaleString(undefined, { maximumFractionDigits: USDC_DECIMALS });
  }, [res?.outAmount]);

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
          Non-custodial swaps on Solana via Jupiter v6. This mini-app calls your proxy API to
          fetch quotes and can build a transaction for your wallet to sign.
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
            disabled={status === 'loading' || !validInputs}
            style={{
              padding: '12px 16px',
              borderRadius: brand.radii.md,
              background:
                status === 'loading' || !validInputs
                  ? brand.colors.primaryAlt
                  : brand.colors.primary,
              color: '#0B0E12',
              fontWeight: 800,
              border: 'none',
              cursor: status === 'loading' || !validInputs ? 'not-allowed' : 'pointer',
            }}
            title={!validInputs ? 'Enter a valid lamports amount & slippage' : 'Get a quote'}
          >
            {status === 'loading' ? 'Fetching Quote…' : 'Get Quote'}
          </button>

          <button
            onClick={onBuildAndSign}
            disabled={!connected || !validInputs || txStatus === 'building' || txStatus === 'sending'}
            style={{
              padding: '12px 16px',
              borderRadius: brand.radii.md,
              background:
                !connected || !validInputs || txStatus === 'building' || txStatus === 'sending'
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
            {txStatus === 'building'
              ? 'Building…'
              : txStatus === 'sending'
              ? 'Sending…'
              : 'Build & Sign'}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatusBanner
            kind={
              status === 'error'
                ? 'error'
                : status === 'success'
                ? 'success'
                : status === 'loading'
                ? 'loading'
                : 'idle'
            }
            message={
              status === 'error'
                ? res?.message || 'Something went wrong'
                : status === 'success'
                ? 'Quote ready'
                : status === 'loading'
                ? 'Talking to Jupiter…'
                : 'Idle'
            }
          />
        </div>

        {res && (
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

        {txStatus !== 'idle' && (
          <div style={{ marginTop: 12 }}>
            <StatusBanner
              kind={txStatus === 'ok' ? 'success' : txStatus === 'fail' ? 'error' : 'loading'}
              message={
                txStatus === 'ok'
                  ? `Sent ✓ ${sig}`
                  : txStatus === 'fail'
                  ? (txError || 'Transaction failed')
                  : txStatus === 'sending'
                  ? 'Awaiting confirmation…'
                  : 'Building transaction…'
              }
            />
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
