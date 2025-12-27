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

console.log('🐋 Aster Whale Alert Bot starting...');
console.log(`📊 Tracking: ${config.asterContract}`);
console.log(`💰 Alert threshold: $${config.minAlertUsd}`);
console.log(`👥 Subscribers: ${subscribers.size}`);

// ==================== BOT COMMANDS ====================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    if (!subscribers.has(chatId)) {
        subscribers.add(chatId);
        saveSubscribers(subscribers);
        console.log(`✅ New subscriber: ${chatId}`);
    }

    const welcomeMessage = `
🐋 *Aster Whale Alert* 🐋

Bienvenue ! Tu es maintenant abonné aux alertes de gros achats d'ASTER.

📊 *Infos actuelles:*
• Token: ASTER
• Réseau: BSC (BNB Chain)
• Seuil d'alerte: $${config.minAlertUsd.toLocaleString()}+
• Abonnés: ${subscribers.size}

*Commandes disponibles:*
/start - S'abonner aux alertes
/stop - Se désabonner
/stats - Voir les statistiques
/price - Prix actuel d'ASTER
/threshold - Seuil d'alerte actuel
/help - Aide

🔔 Tu recevras une notification à chaque gros achat !
`;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;

    if (subscribers.has(chatId)) {
        subscribers.delete(chatId);
        saveSubscribers(subscribers);
        console.log(`❌ Unsubscribed: ${chatId}`);
        await bot.sendMessage(chatId, '👋 Tu es désabonné des alertes. Utilise /start pour te réabonner.');
    } else {
        await bot.sendMessage(chatId, "Tu n'es pas abonné. Utilise /start pour t'abonner.");
    }
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;

    const price = await getAsterPrice();

    // Filter last 24h alerts
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const last24hAlerts = stats.last24h.filter(a => a.timestamp > oneDayAgo);

    const totalVolume24h = last24hAlerts.reduce((sum, a) => sum + a.usd, 0);

    let message = `
📊 *Statistiques Aster Whale Alert*

👥 Abonnés: ${subscribers.size}
🔔 Alertes totales: ${stats.totalAlerts}

*Dernières 24h:*
• Alertes: ${last24hAlerts.length}
• Volume détecté: $${totalVolume24h.toLocaleString()}
`;

    if (stats.largestBuy.tx) {
        message += `
🏆 *Plus gros achat détecté:*
• ${stats.largestBuy.amount.toLocaleString()} ASTER
• $${stats.largestBuy.usd.toLocaleString()}
`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/price/, async (msg) => {
    const chatId = msg.chat.id;
    const price = await getAsterPrice();

    await bot.sendMessage(chatId, `
💰 *Prix ASTER*

Prix actuel: $${price.toFixed(4)}
Market Cap: ~$2B

🔗 [Voir sur BscScan](https://bscscan.com/token/${config.asterContract})
`, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/threshold/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, `
⚙️ *Seuil d'alerte*

Seuil actuel: $${config.minAlertUsd.toLocaleString()}

Les achats supérieurs à ce montant déclenchent une alerte.
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, `
🐋 *Aster Whale Alert - Aide*

Ce bot surveille les gros achats du token ASTER sur la BSC (BNB Chain) et envoie des alertes en temps réel.

*Commandes:*
/start - S'abonner aux alertes
/stop - Se désabonner
/stats - Statistiques des alertes
/price - Prix actuel d'ASTER
/threshold - Seuil d'alerte
/help - Cette aide

*Comment ça marche:*
Le bot surveille les transferts du token ASTER. Quand un achat dépasse $${config.minAlertUsd.toLocaleString()}, tous les abonnés reçoivent une notification avec les détails.

📱 Partage ce bot: @AsterWhaleAlertBot
`, { parse_mode: 'Markdown' });
});

// ==================== WHALE MONITORING ====================

/**
 * Send alert to all subscribers
 */
async function sendAlert(transfer, price) {
    const amount = formatTokenAmount(transfer.value);
    const usdValue = amount * price;

    // Skip if already alerted
    if (recentAlerts.has(transfer.hash)) {
        return;
    }
    recentAlerts.add(transfer.hash);

    // Keep recentAlerts limited
    if (recentAlerts.size > 1000) {
        const first = recentAlerts.values().next().value;
        recentAlerts.delete(first);
    }

    // Update stats
    stats.totalAlerts++;
    stats.last24h.push({ amount, usd: usdValue, timestamp: Date.now() });

    if (usdValue > stats.largestBuy.usd) {
        stats.largestBuy = { amount, usd: usdValue, tx: transfer.hash };
    }

    // Clean old stats
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    stats.last24h = stats.last24h.filter(a => a.timestamp > oneDayAgo);

    // Create alert message with emojis based on size
    let sizeEmoji = '🐋';
    if (usdValue >= 100000) sizeEmoji = '🚨🐋🚨';
    else if (usdValue >= 50000) sizeEmoji = '🔥🐋🔥';
    else if (usdValue >= 20000) sizeEmoji = '💎🐋';

    const message = `
${sizeEmoji} *GROS ACHAT ASTER DÉTECTÉ* ${sizeEmoji}

💰 *Montant:* ${amount.toLocaleString()} ASTER
💵 *Valeur:* $${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}

👤 *De:* \`${shortenAddress(transfer.from)}\`
👤 *Vers:* \`${shortenAddress(transfer.to)}\`

🔗 [Voir la transaction](${getTxLink(transfer.hash)})

⏰ ${new Date().toLocaleString('fr-FR')}
`;

    console.log(`🐋 Alert: ${amount.toLocaleString()} ASTER ($${usdValue.toLocaleString()})`);

    // Send to all subscribers
    for (const chatId of subscribers) {
        try {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (error) {
            if (error.response?.statusCode === 403) {
                // User blocked the bot
                subscribers.delete(chatId);
                saveSubscribers(subscribers);
                console.log(`Removed blocked user: ${chatId}`);
            } else {
                console.error(`Error sending to ${chatId}:`, error.message);
            }
        }
    }
}

/**
 * Check for new whale transfers
 */
async function checkWhaleTransfers() {
    try {
        const price = await getAsterPrice();
        const minTokenAmount = config.minAlertUsd / price;

        let lastBlock = loadLastBlock();

        // If no last block, get current block and start from there
        if (!lastBlock) {
            lastBlock = await getLatestBlock();
            if (lastBlock) {
                saveLastBlock(lastBlock);
                console.log(`📦 Starting from block: ${lastBlock}`);
            }
            return;
        }

        // Get recent transfers
        const transfers = await getTokenTransfers(lastBlock);

        if (transfers.length === 0) {
            return;
        }

        // Update last block
        const maxBlock = Math.max(...transfers.map(t => parseInt(t.blockNumber)));
        if (maxBlock > lastBlock) {
            saveLastBlock(maxBlock);
        }

        // Filter whale transfers (buys only - transfers TO certain addresses could indicate buys)
        // For simplicity, we alert on all large transfers
        for (const transfer of transfers) {
            const amount = formatTokenAmount(transfer.value);

            if (amount >= minTokenAmount) {
                await sendAlert(transfer, price);
            }
        }

    } catch (error) {
        console.error('Error checking transfers:', error.message);
    }
}

// ==================== START MONITORING ====================

// Initial check
console.log('🔍 Starting whale monitoring...');
checkWhaleTransfers();

// Set up interval
setInterval(checkWhaleTransfers, config.pollInterval * 1000);

console.log(`⏱️ Checking every ${config.pollInterval} seconds`);
console.log('✅ Bot is running! Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    saveSubscribers(subscribers);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    saveSubscribers(subscribers);
    process.exit(0);
});
