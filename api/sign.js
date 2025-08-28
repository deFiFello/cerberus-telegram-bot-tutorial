// sign.js
const fs = require('fs')
const bs58 = require('bs58')
const nacl = require('tweetnacl')
const { VersionedTransaction } = require('@solana/web3.js')
const path = require('path')

async function main() {
  const input = process.argv[2]
  if (!input) throw new Error('Usage: node sign.js <orderTx.json>')
  const j = JSON.parse(fs.readFileSync(input, 'utf8'))
  const b64 = j.transaction
  if (!b64) throw new Error('No transaction in JSON')

  const secret = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config', 'solana', 'id.json'), 'utf8'))
  const keypair = nacl.sign.keyPair.fromSecretKey(Uint8Array.from(secret))

  const tx = VersionedTransaction.deserialize(Buffer.from(b64, 'base64'))
  tx.sign([{
    publicKey: { toBytes: () => keypair.publicKey, toBase58: () => bs58.encode(keypair.publicKey) },
    secretKey: keypair.secretKey
  }])

  const out = tx.serialize()
  fs.writeFileSync('signed.json', JSON.stringify({ serializedTransaction: Buffer.from(out).toString('base64'), requestId: j.requestId }, null, 2))
  console.log('Wrote signed.json')
}
main().catch(e => { console.error(e); process.exit(1) })
