/**
 * In-memory cooldown manager for commands and features
 */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Check if a key is on cooldown
   * @param {string} key - e.g. "ask-gandalf:userId" or "greeting:channelId"
   * @param {number} durationMs - cooldown duration in milliseconds
   * @returns {{ onCooldown: boolean, timeLeftMs: number }}
   */
  check(key, durationMs) {
    const now = Date.now();
    const expiration = this.cooldowns.get(key);

    if (expiration && now < expiration) {
      return {
        onCooldown: true,
        timeLeftMs: expiration - now
      };
    }

    this.cooldowns.set(key, now + durationMs);
    return {
      onCooldown: false,
      timeLeftMs: 0
    };
  }

  /**
   * Clear an expired cooldown manually
   */
  clear(key) {
    this.cooldowns.delete(key);
  }
}

module.exports = new CooldownManager();
