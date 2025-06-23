const TTL_MINUTES = 30;

interface TimedEntry {
    timestamp: number;
}

export const autoCleanup = (map: Map<string, TimedEntry>): void => {
    const now = Date.now();

    for (const [key, value] of map.entries()) {
        const minutesPassed = (now - value.timestamp) / (1000 * 60);
        if (minutesPassed > TTL_MINUTES) {
            map.delete(key);
        }
    }
};