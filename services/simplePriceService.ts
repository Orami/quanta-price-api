/**
 * Simple QUANTA Price Service
 * Uses aggregator APIs (GeckoTerminal, DexScreener) that already index your pool
 * No complex on-chain reading needed!
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  QUANTA_TOKEN: '0x5acdc563450cc35055d7344287c327fafb2b371a',
  QUANTA_VIRTUAL_POOL: '0xd17616d20d81d6e2eaa8f6eca5583a28793da685',
};

interface PriceData {
  priceUSD: number;
  priceVIRTUAL?: number;
  liquidityUSD: number;
  volume24h: number;
  priceChange24h?: number;
  source: string;
  pool: string;
  timestamp: number;
}

export class SimplePriceService {
  /**
   * Get price from GeckoTerminal API (most reliable for your token)
   */
  async getPriceFromGecko(): Promise<PriceData | null> {
    try {
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/base/pools/${CONFIG.QUANTA_VIRTUAL_POOL}`
      );

      if (!response.ok) return null;

      const data: any = await response.json();
      const attrs = data.data.attributes;

      return {
        priceUSD: parseFloat(attrs.base_token_price_usd),
        liquidityUSD: parseFloat(attrs.reserve_in_usd),
        volume24h: parseFloat(attrs.volume_usd.h24),
        priceChange24h: parseFloat(attrs.price_change_percentage.h24),
        source: 'GeckoTerminal',
        pool: CONFIG.QUANTA_VIRTUAL_POOL,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('GeckoTerminal error:', error);
      return null;
    }
  }

  /**
   * Get price from DexScreener API (backup)
   */
  async getPriceFromDexScreener(): Promise<PriceData | null> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${CONFIG.QUANTA_TOKEN}`
      );

      if (!response.ok) return null;

      const data: any = await response.json();

      if (!data.pairs || data.pairs.length === 0) return null;

      // Get the pair with most liquidity
      const bestPair = data.pairs.sort((a: any, b: any) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];

      return {
        priceUSD: parseFloat(bestPair.priceUsd),
        liquidityUSD: parseFloat(bestPair.liquidity?.usd || 0),
        volume24h: parseFloat(bestPair.volume?.h24 || 0),
        priceChange24h: parseFloat(bestPair.priceChange?.h24 || 0),
        source: 'DexScreener',
        pool: bestPair.pairAddress,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('DexScreener error:', error);
      return null;
    }
  }

  /**
   * Get best price from all sources
   */
  async getPrice(): Promise<PriceData> {
    // Try GeckoTerminal first (most reliable for your pool)
    let price = await this.getPriceFromGecko();

    // Fallback to DexScreener
    if (!price) {
      console.log('GeckoTerminal failed, trying DexScreener...');
      price = await this.getPriceFromDexScreener();
    }

    if (!price) {
      throw new Error('Unable to fetch price from any source');
    }

    return price;
  }

  /**
   * Get comprehensive data including all sources
   */
  async getAllPrices(): Promise<{
    primary: PriceData;
    sources: {
      gecko?: PriceData | null;
      dexscreener?: PriceData | null;
    };
    recommendation: string;
  }> {
    const [gecko, dexscreener] = await Promise.all([
      this.getPriceFromGecko(),
      this.getPriceFromDexScreener(),
    ]);

    const primary = gecko || dexscreener;

    if (!primary) {
      throw new Error('No price data available from any source');
    }

    // Determine which source is best
    let recommendation = 'Use GeckoTerminal';
    if (!gecko && dexscreener) {
      recommendation = 'Use DexScreener (GeckoTerminal unavailable)';
    } else if (gecko && dexscreener) {
      if (gecko.liquidityUSD > dexscreener.liquidityUSD) {
        recommendation = 'Use GeckoTerminal (higher liquidity pool)';
      } else {
        recommendation = 'Use DexScreener (higher liquidity pool)';
      }
    }

    return {
      primary,
      sources: {
        gecko,
        dexscreener,
      },
      recommendation,
    };
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const service = new SimplePriceService();

    console.log('='.repeat(60));
    console.log('QUANTA Price Tracker - Simple & Reliable');
    console.log('='.repeat(60) + '\n');

    try {
      const data = await service.getAllPrices();

      console.log('PRIMARY PRICE:');
      console.log(`  💰 $${data.primary.priceUSD.toFixed(10)} USD`);
      console.log(`  💧 $${data.primary.liquidityUSD.toFixed(2)} Liquidity`);
      console.log(`  📊 $${data.primary.volume24h.toFixed(2)} Volume (24h)`);
      if (data.primary.priceChange24h) {
        const change = data.primary.priceChange24h;
        const emoji = change > 0 ? '📈' : '📉';
        console.log(`  ${emoji} ${change > 0 ? '+' : ''}${change.toFixed(2)}% (24h)`);
      }
      console.log(`  🔗 Source: ${data.primary.source}`);
      console.log(`  📍 Pool: ${data.primary.pool}`);

      console.log('\n' + '-'.repeat(60) + '\n');

      console.log('ALL SOURCES:');
      if (data.sources.gecko) {
        console.log(`  ✓ GeckoTerminal: $${data.sources.gecko.priceUSD.toFixed(10)}`);
        console.log(`    Liquidity: $${data.sources.gecko.liquidityUSD.toFixed(2)}`);
      } else {
        console.log('  ✗ GeckoTerminal: Not available');
      }

      if (data.sources.dexscreener) {
        console.log(`  ✓ DexScreener: $${data.sources.dexscreener.priceUSD.toFixed(10)}`);
        console.log(`    Liquidity: $${data.sources.dexscreener.liquidityUSD.toFixed(2)}`);
      } else {
        console.log('  ✗ DexScreener: Not available');
      }

      console.log('\n' + '-'.repeat(60) + '\n');

      console.log(`📌 Recommendation: ${data.recommendation}`);

      console.log('\n' + '='.repeat(60) + '\n');
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  })();
}

export default SimplePriceService;
