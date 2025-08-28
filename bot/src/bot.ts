import 'dotenv/config'
import { Telegraf } from 'telegraf'

const token = process.env.TELEGRAM_TOKEN || ''
console.log('ENV token prefix:', token.slice(0, 12))

if (!token) {
  console.error('Missing TELEGRAM_TOKEN in bot/.env')
  process.exit(1)
}

const bot = new Telegraf(token)

// basic handlers
bot.start(ctx => ctx.reply('Cerberus online'))
bot.help(ctx => ctx.reply('Use /swap <IN> <OUT> <AMOUNT>'))

bot.command('swap', async ctx => {
  const [, i, o, a] = ctx.message.text.split(' ')
  if (!i || !o || !a) return ctx.reply('Usage: /swap SOL USDC 1')
  const url = `${process.env.PUBLIC_WEB_URL || 'http://localhost:3000'}/app?in=${i}&out=${o}&amt=${a}`
  await ctx.reply('Open Cerberus Mini App to sign', {
    reply_markup: { inline_keyboard: [[{ text: 'Open Mini App', web_app: { url } }]] }
  })
})

// surface any errors clearly
process.on('unhandledRejection', (e) => {
  console.error('UnhandledRejection:', e)
})
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', e)
})

async function main() {
  try {
    await bot.launch()
    console.log('Bot is running')
  } catch (e) {
    console.error('Failed to launch bot:', e)
    process.exit(1)
  }
}
main()
