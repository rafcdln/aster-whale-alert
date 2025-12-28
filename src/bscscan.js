import fetch from 'node-fetch';
import { config } from './config.js';

/**
 * Get ASTER token transfers from Moralis API
 */
export async function getTokenTransfers() {
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${config.asterContract}/transfers?chain=bsc&limit=100&order=DESC`;

    try {
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'X-API-Key': config.moralisApiKey
            }
        });
        const data = await response.json();

        if (data.result && Array.isArray(data.result)) {
            return data.result.map(tx => ({
                hash: tx.transaction_hash,
                from: tx.from_address,
                to: tx.to_address,
                value: tx.value,
                blockNumber: tx.block_number,
                timeStamp: Math.floor(new Date(tx.block_timestamp).getTime() / 1000)
            }));
        }

        if (data.message) {
            console.warn('Moralis API warning:', data.message);
        }
        return [];
    } catch (error) {
        console.error('Moralis API error:', error.message);
        return [];
    }
}

/**
 * Get current ASTER price from DexScreener
 */
export async function getAsterPrice() {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${config.asterContract}`
        );
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
            const price = parseFloat(data.pairs[0].priceUsd);
            if (price > 0) {
                return price;
            }
        }

        return 0.70;
    } catch (error) {
        console.error('Error getting price:', error.message);
        return 0.70;
    }
}

/**
 * Format token amount from wei
 */
export function formatTokenAmount(value) {
    const amount = BigInt(value);
    const decimals = BigInt(10 ** config.asterDecimals);
    const whole = amount / decimals;
    const fraction = amount % decimals;

    const fractionStr = fraction.toString().padStart(config.asterDecimals, '0').slice(0, 2);
    return parseFloat(`${whole}.${fractionStr}`);
}

/**
 * Get transaction link
 */
export function getTxLink(hash) {
    return `https://bscscan.com/tx/${hash}`;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
