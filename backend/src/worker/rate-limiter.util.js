
class TokenBucketRateLimiter {
  constructor({ tokensPerInterval, intervalMs = 1000 }) {
    this.capacity = tokensPerInterval;
    this.tokens = tokensPerInterval;
    this.queue = [];
    this.timer = setInterval(() => this._refill(), intervalMs);
    this.timer.unref?.();
  }

  _refill() {
    this.tokens = this.capacity;

    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens -= 1;
      const resolve = this.queue.shift();
      resolve();
    }
  }

  acquire() {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => this.queue.push(resolve));
  }

  stop() {
    clearInterval(this.timer);
  }
}

module.exports = { TokenBucketRateLimiter };
