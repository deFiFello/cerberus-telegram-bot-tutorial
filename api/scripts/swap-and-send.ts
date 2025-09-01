/**
 * Jupiter v6 swap + send (TypeScript / tsx)
 * Node 18+ (global fetch). Requires @solana/web3.js.
 *
 * Usage (mainnet):
 *   npx tsx src/swap-and-send.ts \
 *     --in So11111111111111111111111111111111111111112 \
 *     --out EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
 *     --amount 1000000 \
 *     --slip 50
 *
 * Devnet (if you need it):
 *   npx tsx src/swap-and-send.ts ... --devnet
 *
 * Custom RPC or keypair:
 *   --rpc https://your.rpc/ --keypair /path/to/keypair.json
 */

import { Connection, Keypair, PublicKey, VersionedTransaction, Commitment } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ---------------- CLI parsing (no extra deps) ----------------
function getFlag(name: string, dflt?: string) {
    const i = process.argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
      return process.argv[i + 1];
    }
    return dflt;
  }
  function hasFlag(name: string) {
    return process.argv.includes(`--${name}`);
  }
  
  // helper: required string flag
  function reqFlag(name: string): string {
    const v = getFlag(name);
    if (!v) throw new Error(`Missing required flag --${name}`);
    return v;
  }
  
  const DEVNET   = hasFlag("devnet");
  const RPC_URL  = getFlag("rpc", DEVNET ? "https://api.devnet.solana.com"
                                         : "https://api.mainnet-beta.solana.com") as string;
  const KEYPAIR  = getFlag("keypair",
    path.join(process.env.HOME ?? "", ".config", "solana", "id.json")) as string;
  
  const INPUT_MINT  = reqFlag("in");       // <- now typed string
  const OUTPUT_MINT = reqFlag("out");      // <- now typed string
  const AMOUNT_STR  = reqFlag("amount");   // <- now typed string
  const SLIP_STR    = reqFlag("slip");     // <- now typed string
  const PRIORITY    = Number(getFlag("priority", "0"));
  
if (!INPUT_MINT || !OUTPUT_MINT || !AMOUNT_STR || !SLIP_STR) {
  console.error("Missing required flags. Example:");
  console.error("  --in <mint> --out <mint> --amount <u64> --slip <bps> [--rpc <url>] [--devnet] [--keypair <file>] [--priority <microLamports>]");
  process.exit(1);
}

const AMOUNT = Number(AMOUNT_STR);
const SLIP   = Number(SLIP_STR);
if (!Number.isFinite(AMOUNT) || AMOUNT <= 0) {
  console.error("amount must be a positive number of base units (e.g., lamports, token smallest units).");
  process.exit(1);
}
if (!Number.isFinite(SLIP) || SLIP < 0) {
  console.error("slip must be non-negative bps.");
  process.exit(1);
}

// ---------------- Keypair loading ----------------
function loadKeypair(file: string): Keypair {
  const raw = fs.readFileSync(file, "utf-8");
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(new Uint8Array(arr));
}

const payer = loadKeypair(KEYPAIR);
const payerPub = payer.publicKey;

// ---------------- Solana connection ----------------
const commitment: Commitment = "confirmed";
const connection = new Connection(RPC_URL, { commitment });

// ---------------- Jupiter v6 helpers ----------------
const QUOTE_BASE = "https://quote-api.jup.ag";

async function jupQuote(params: URLSearchParams) {
  const url = `${QUOTE_BASE}/v6/quote?${params.toString()}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Quote failed: ${r.status} ${t}`);
  }
  return r.json();
}

async function jupBuildSwap(quoteResponse: any, userPublicKey: string, slippageBps: number) {
  const body = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
    slippageBps,
    asLegacyTransaction: false,
    prioritizationFeeLamports: PRIORITY > 0 ? PRIORITY : 0,
  };
  const r = await fetch(`${QUOTE_BASE}/v6/swap`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Swap build failed: ${r.status} ${t}`);
  }
  return r.json();
}

// ---------------- Main ----------------
(async () => {
  // Basic sanity
  try { new PublicKey(payerPub); } catch { console.error("Invalid keypair."); process.exit(1); }
  console.log();
  console.log("RPC     :", RPC_URL);
  console.log("Wallet  :", payerPub.toBase58());
  console.log("Input   :", INPUT_MINT);
  console.log("Output  :", OUTPUT_MINT);
  console.log("Amount  :", AMOUNT);
  console.log("Slippage:", SLIP, "bps");
  if (PRIORITY > 0) console.log("Priority:", PRIORITY, "microLamports");

  // 1) Quote
  const params = new URLSearchParams({
    inputMint: INPUT_MINT,
    outputMint: OUTPUT_MINT,
    amount: String(AMOUNT),
    slippageBps: String(SLIP),
  });
  const quote = await jupQuote(params);

  // 2) Build swap transaction targeted to our wallet
  const swap = await jupBuildSwap(quote, payerPub.toBase58(), SLIP);

  // 3) Deserialize the v0 transaction
  const tx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, "base64"));

  // 4) Refresh recent blockhash (avoid “Blockhash not found” if a few seconds passed)
  const latest = await connection.getLatestBlockhash(commitment);
  tx.message.recentBlockhash = latest.blockhash;

  // 5) Check fee payer matches our wallet (just a friendly assertion)
  const feePayer = tx.message.staticAccountKeys[0] || tx.message.getAccountKeys().staticAccountKeys[0];
  if (feePayer?.toBase58() !== payerPub.toBase58()) {
    console.warn("Warning: fee payer in built tx differs from your wallet. Proceeding, but swap may fail to verify.");
  }

  // 6) Sign with our key
  tx.sign([payer]);

  // 7) Optional: quick simulation for clearer errors before sending
  try {
    const sim = await connection.simulateTransaction(tx, { sigVerify: true });
    if (sim.value.err) {
      console.error("\nSimulation reported an error:", JSON.stringify(sim.value.err));
      if (sim.value.logs) {
        console.error("Logs:");
        sim.value.logs.forEach((l) => console.error("  ", l));
      }
      process.exit(1);
    }
  } catch (e: any) {
    console.warn("Simulation call failed (continuing to send):", e?.message || e);
  }

  // 8) Send the signed transaction
  try {
    const raw = Buffer.from(tx.serialize());
    const sig = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: commitment,
      maxRetries: 3,
    });

    console.log("\nSubmitted. Signature:", sig);
    console.log(
      `Explorer: https://explorer.solana.com/tx/${sig}${DEVNET ? "?cluster=devnet" : ""}`
    );

    // 9) Confirm
    const conf = await connection.confirmTransaction(
      { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      commitment
    );

    if (conf.value.err) {
      console.error("Transaction confirmed with error:", conf.value.err);
      process.exit(1);
    }
    console.log("✅ Success. Confirmed at", commitment);
  } catch (err: any) {
    console.error("\nSend failed:", err?.message || err);
    // web3.js SendTransactionError often carries runtime logs:
    const logs = (err && (err.logs || err.value?.logs)) || [];
    if (Array.isArray(logs) && logs.length) {
      console.error("Logs:");
      logs.forEach((l: string) => console.error("  ", l));
    }
    process.exit(1);
  }
})().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
