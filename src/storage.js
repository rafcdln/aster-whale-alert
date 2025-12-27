import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Ensure data directory exists
const dataDir = path.dirname(config.subscribersFile);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load subscribers from file
 */
export function loadSubscribers() {
    try {
        if (fs.existsSync(config.subscribersFile)) {
            const data = fs.readFileSync(config.subscribersFile, 'utf-8');
            return new Set(JSON.parse(data));
        }
    } catch (error) {
        console.error('Error loading subscribers:', error.message);
    }
    return new Set();
}

/**
 * Save subscribers to file
 */
export function saveSubscribers(subscribers) {
    try {
        fs.writeFileSync(
            config.subscribersFile,
            JSON.stringify([...subscribers], null, 2)
        );
    } catch (error) {
        console.error('Error saving subscribers:', error.message);
    }
}

/**
 * Load last processed block
 */
export function loadLastBlock() {
    try {
        if (fs.existsSync(config.lastBlockFile)) {
            const data = fs.readFileSync(config.lastBlockFile, 'utf-8');
            return JSON.parse(data).block || null;
        }
    } catch (error) {
        console.error('Error loading last block:', error.message);
    }
    return null;
}

/**
 * Save last processed block
 */
export function saveLastBlock(block) {
    try {
        fs.writeFileSync(
            config.lastBlockFile,
            JSON.stringify({ block, timestamp: Date.now() }, null, 2)
        );
    } catch (error) {
        console.error('Error saving last block:', error.message);
    }
}
