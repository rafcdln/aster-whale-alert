import fetch from 'node-fetch';
import { config } from './config.js';

/**
 * Get ASTER token transfers from BscScan
 */
export async function getTokenTransfers(startBlock = 0) {
    const url = new URL(config.bscscanApi);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokentx');
    url.searchParams.set('contractaddress', config.asterContract);
    url.searchParams.set('startblock', startBlock.toString());
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('apikey', config.bscscanApiKey);

    try {
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result;
        }

        if (data.message === 'No transactions found') {
            return [];
        }

        console.warn('BscScan API warning:', data.message);
        return [];
    } catch (error) {
        console.error('BscScan API error:', error.message);
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
            // Get the most liquid pair
            const price = parseFloat(data.pairs[0].priceUsd);
            if (price > 0) {
                return price;
            }
        }

        return 0.70; // Fallback
    } catch (error) {
        console.error('Error getting price:', error.message);
        return 0.70;
    }
}

/**
 * Get latest block number
 */
export async function getLatestBlock() {
    const url = new URL(config.bscscanApi);
    url.searchParams.set('module', 'proxy');
    url.searchParams.set('action', 'eth_blockNumber');
    url.searchParams.set('apikey', config.bscscanApiKey);

    try {
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.result) {
            return parseInt(data.result, 16);
        }
    } catch (error) {
        console.error('Error getting latest block:', error.message);
    }
    return null;
}

/**
 * Format token amount from wei
 */
export function formatTokenAmount(value) {
    const amount = BigInt(value);
    const decimals = BigInt(10 ** config.asterDecimals);
    const whole = amount / decimals;
    const fraction = amount % decimals;

    // Format with 2 decimal places
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
 * Get address link
 */
export function getAddressLink(address) {
    return `https://bscscan.com/address/${address}`;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
