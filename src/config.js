import 'dotenv/config';

export const config = {
  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  
  // BSC/BscScan
  bscscanApiKey: process.env.BSCSCAN_API_KEY,
  asterContract: process.env.ASTER_CONTRACT || '0x000Ae314E2A2172a039B26378814C252734f556A',
  
  // Alert settings
  minAlertUsd: parseFloat(process.env.MIN_ALERT_USD) || 5000,
  pollInterval: parseInt(process.env.POLL_INTERVAL) || 30,
  
  // Token info
  asterDecimals: 18,
  asterSymbol: 'ASTER',
  
  // API URLs
  bscscanApi: 'https://api.bscscan.com/api',
  
  // Data file for subscribers
  subscribersFile: './data/subscribers.json',
  lastBlockFile: './data/lastblock.json'
};
