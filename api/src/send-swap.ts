import { readFileSync } from "fs";
import { Connection, Keypair, VersionedTransaction, PublicKey } from "@solana/web3.js";

async function main() {
  const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

  // 1) load wallet from ~/.config/solana/id.json
  const idPath = process.env.SOLANA_KEY_PATH || `${process.env.HOME}/.config/solana/id.json`;
  const secret = JSON.parse(readFileSync(idPath, "utf8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

  // 2) read swap transaction base64 (pass it in via file or env)
  const b64 = process.env.SWAP_TX_B64 || readFileSync(process.env.SWAP_TX_FILE || "swap_tx.b64", "utf8").trim();
  const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));

  // 3) sanity check the tx is for our wallet
  const payerPk = new PublicKey(tx.message.staticAccountKeys[0]);
  if (!payerPk.equals(payer.publicKey)) {
    console.warn(`Warning: tx payer ${payerPk.toBase58()} != wallet ${payer.publicKey.toBase58()}`);
  }

  const connection = new Connection(RPC_URL, "confirmed");

  // 4) sign and send
  tx.sign([payer]); // adds our signature in-place
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log("Signature:", sig);

  // 5) (optional) confirm
  const conf = await connection.confirmTransaction(sig, "confirmed");
  console.log("Confirmation:", conf.value);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
