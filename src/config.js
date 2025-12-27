import 'dotenv/config';

export const config = {
  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,

  // Moralis API (free tier)
  moralisApiKey: process.env.MORALIS_API_KEY,

  // Token
  asterContract: process.env.ASTER_CONTRACT || '0x000Ae314E2A2172a039B26378814C252734f556A',

  // Alert settings
  minAlertUsd: parseFloat(process.env.MIN_ALERT_USD) || 5000,
  pollInterval: parseInt(process.env.POLL_INTERVAL) || 30,

  // Token info
  asterDecimals: 18,
  asterSymbol: 'ASTER',

  // Data file for subscribers
  subscribersFile: './data/subscribers.json',
  lastBlockFile: './data/lastblock.json'
};
