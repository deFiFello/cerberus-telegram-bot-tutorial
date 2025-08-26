import { TokenInfo } from '@jup-ag/core';

class TokenPairCache {
  private cache: Map<string, {
    pair: [TokenInfo, TokenInfo],
    lastUpdated: number
  }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  setPair(token1: TokenInfo, token2: TokenInfo) {
    const key = this.getPairKey(token1.address, token2.address);
    this.cache.set(key, {
      pair: [token1, token2],
      lastUpdated: Date.now()
    });
  }

  getPair(address1: string, address2: string) {
    const key = this.getPairKey(address1, address2);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached.pair;
    }
    return null;
  }

  private getPairKey(address1: string, address2: string): string {
    return [address1, address2].sort().join(':');
  }
}

export const tokenPairCache = new TokenPairCache();
