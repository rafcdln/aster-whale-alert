import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { loadSubscribers, saveSubscribers, loadLastBlock, saveLastBlock } from './storage.js';
import {
    getTokenTransfers,
    getAsterPrice,
    getLatestBlock,
    formatTokenAmount,
    getTxLink,
    shortenAddress
} from './bscscan.js';

// Initialize bot
const bot = new TelegramBot(config.telegramToken, { polling: true });

// Load subscribers
let subscribers = loadSubscribers();

// Track recent alerts to avoid duplicates
const recentAlerts = new Set();

// Stats tracking
let stats = {
    totalAlerts: 0,
    largestBuy: { amount: 0, usd: 0, tx: null },
    last24h: []
};

// Format helpers
const fmt = {
    k: (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0),
    usd: (n) => `$${fmt.k(n)}`,
    price: (n) => `$${n.toFixed(4)}`,
    threshold: () => fmt.usd(config.minAlertUsd)
};

console.log('Aster Whale Alert starting...');
console.log(`Tracking: ${config.asterContract}`);
console.log(`Threshold: ${fmt.threshold()}`);
console.log(`Subscribers: ${subscribers.size}`);

// ==================== BOT COMMANDS ====================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const price = await getAsterPrice();

    if (!subscribers.has(chatId)) {
        subscribers.add(chatId);
        saveSubscribers(subscribers);
        console.log(`+ Subscriber: ${chatId}`);
    }

    await bot.sendMessage(chatId, `
*ASTER WHALE ALERT*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

Subscribed to whale alerts.

ASTER ${fmt.price(price)} · BSC
Threshold: ${fmt.threshold()}
Members: ${subscribers.size}

/price  /stats  /stop
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;

    if (subscribers.has(chatId)) {
        subscribers.delete(chatId);
        saveSubscribers(subscribers);
        await bot.sendMessage(chatId, 'Unsubscribed. Use /start to resubscribe.');
    } else {
        await bot.sendMessage(chatId, 'Not subscribed. Use /start to subscribe.');
    }
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const price = await getAsterPrice();

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const last24h = stats.last24h.filter(a => a.timestamp > oneDayAgo);
    const volume24h = last24h.reduce((sum, a) => sum + a.usd, 0);

    let message = `
*STATISTICS*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

Members: ${subscribers.size}
Total alerts: ${stats.totalAlerts}

24H: ${last24h.length} alerts · ${fmt.usd(volume24h)} volume`;

    if (stats.largestBuy.tx) {
        message += `
Record: ${fmt.k(stats.largestBuy.amount)} ASTER (${fmt.usd(stats.largestBuy.usd)})`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/price/, async (msg) => {
    const chatId = msg.chat.id;
    const price = await getAsterPrice();
    const mcap = (2000000000 * price / 0.70);

    await bot.sendMessage(chatId, `
*ASTER*  ${fmt.price(price)}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

MCap: ~$${(mcap / 1e9).toFixed(2)}B

[Chart](https://dexscreener.com/bsc/${config.asterContract}) · [Explorer](https://bscscan.com/token/${config.asterContract})
`, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/threshold/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, `
*THRESHOLD*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

Current: ${fmt.threshold()}

Alerts trigger above this amount.
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, `
*ASTER WHALE ALERT*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

Real-time large ASTER buys on BSC.

/start · /stop · /price · /stats

Threshold: ${fmt.threshold()}
`, { parse_mode: 'Markdown' });
});

// ==================== WHALE MONITORING ====================

async function sendAlert(transfer, price) {
    const amount = formatTokenAmount(transfer.value);
    const usdValue = amount * price;

    if (recentAlerts.has(transfer.hash)) return;
    recentAlerts.add(transfer.hash);

    if (recentAlerts.size > 1000) {
        recentAlerts.delete(recentAlerts.values().next().value);
    }

    stats.totalAlerts++;
    stats.last24h.push({ amount, usd: usdValue, timestamp: Date.now() });

    if (usdValue > stats.largestBuy.usd) {
        stats.largestBuy = { amount, usd: usdValue, tx: transfer.hash };
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    stats.last24h = stats.last24h.filter(a => a.timestamp > oneDayAgo);

    // Tier classification (based on threshold multiples)
    let tier = 'LARGE BUY';
    if (usdValue >= config.minAlertUsd * 10) tier = 'MEGA WHALE';
    else if (usdValue >= config.minAlertUsd * 2) tier = 'WHALE';

    const message = `
*${tier}*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

${fmt.k(amount)} ASTER · ${fmt.usd(usdValue)}

\`${shortenAddress(transfer.from)}\` → \`${shortenAddress(transfer.to)}\`

[View Tx](${getTxLink(transfer.hash)}) · ${fmt.price(price)}
`;

    console.log(`Alert: ${fmt.k(amount)} ASTER (${fmt.usd(usdValue)})`);

    for (const chatId of subscribers) {
        try {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (error) {
            if (error.response?.statusCode === 403) {
                subscribers.delete(chatId);
                saveSubscribers(subscribers);
            }
        }
    }
}

async function checkWhaleTransfers() {
    try {
        const price = await getAsterPrice();
        const minTokenAmount = config.minAlertUsd / price;

        let lastBlock = loadLastBlock();

        if (!lastBlock) {
            lastBlock = await getLatestBlock();
            if (lastBlock) {
                saveLastBlock(lastBlock);
                console.log(`Starting from block: ${lastBlock}`);
            }
            return;
        }

        const transfers = await getTokenTransfers(lastBlock);

        if (transfers.length === 0) return;

        const maxBlock = Math.max(...transfers.map(t => parseInt(t.blockNumber)));
        if (maxBlock > lastBlock) saveLastBlock(maxBlock);

        for (const transfer of transfers) {
            const amount = formatTokenAmount(transfer.value);
            if (amount >= minTokenAmount) {
                await sendAlert(transfer, price);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// ==================== START ====================

console.log('Monitoring started...');
checkWhaleTransfers();
setInterval(checkWhaleTransfers, config.pollInterval * 1000);
console.log(`Interval: ${config.pollInterval}s`);

process.on('SIGINT', () => {
    saveSubscribers(subscribers);
    process.exit(0);
});

process.on('SIGTERM', () => {
    saveSubscribers(subscribers);
    process.exit(0);
});
