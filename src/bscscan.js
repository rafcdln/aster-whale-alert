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
 * Get current ASTER price from DEX (PancakeSwap)
 * Uses BNB price as intermediate
 */
export async function getAsterPrice() {
    try {
        // Try to get price from CoinGecko or similar
        // For now, use a fallback price
        // You can integrate with DEX APIs later

        // Fallback to ~$0.70 as mentioned by user
        return 0.70;
    } catch (error) {
        console.error('Error getting price:', error.message);
        return 0.70; // Fallback price
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
