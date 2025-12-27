import fetch from 'node-fetch';
import { config } from './config.js';

/**
 * Get ASTER token transfers from Moralis API
 */
export async function getTokenTransfers(cursor = null) {
    const url = new URL('https://deep-index.moralis.io/api/v2.2/erc20/transfers');
    url.searchParams.set('chain', 'bsc');
    url.searchParams.set('contract_addresses', config.asterContract);
    url.searchParams.set('limit', '100');
    if (cursor) {
        url.searchParams.set('cursor', cursor);
    }

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'accept': 'application/json',
                'X-API-Key': config.moralisApiKey
            }
        });
        const data = await response.json();

        if (data.result && Array.isArray(data.result)) {
            // Transform to match expected format
            return data.result.map(tx => ({
                hash: tx.transaction_hash,
                from: tx.from_address,
                to: tx.to_address,
                value: tx.value,
                blockNumber: tx.block_number,
                timeStamp: Math.floor(new Date(tx.block_timestamp).getTime() / 1000)
            }));
        }

        console.warn('Moralis API warning:', data.message || 'No data');
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
 * Get latest block number
 */
export async function getLatestBlock() {
    try {
        const response = await fetch('https://deep-index.moralis.io/api/v2.2/block/latest?chain=bsc', {
            headers: {
                'accept': 'application/json',
                'X-API-Key': config.moralisApiKey
            }
        });
        const data = await response.json();
        return parseInt(data.block_number);
    } catch (error) {
        console.error('Error getting latest block:', error.message);
        return null;
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
