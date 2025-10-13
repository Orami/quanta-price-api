/**
 * Price Monitoring Script
 * Monitors QUANTA price accuracy across multiple platforms
 */

import { QuantaPriceService } from '../services/priceService';
import axios from 'axios';

interface PriceSource {
  name: string;
  url: string;
  fetchPrice: () => Promise<number | null>;
}

const TOKEN_ADDRESS = '0x5aCdC563450Cc35055D7344287C327FAFb2B371A';

class PriceMonitor {
  private priceService: QuantaPriceService;
  private sources: PriceSource[];

  constructor() {
    this.priceService = new QuantaPriceService();
    this.sources = this.initializeSources();
  }

  private initializeSources(): PriceSource[] {
    return [
      {
        name: 'On-Chain Oracle',
        url: 'Internal',
        fetchPrice: async () => {
          try {
            const data = await this.priceService.getQuantaPriceUSD();
            return data.priceUSD;
          } catch {
            return null;
          }
        },
      },
      {
        name: 'DexScreener',
        url: `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`,
        fetchPrice: async () => {
          try {
            const response = await axios.get(this.sources[1].url, { timeout: 5000 });
            if (response.data.pairs && response.data.pairs.length > 0) {
              return parseFloat(response.data.pairs[0].priceUsd);
            }
            return null;
          } catch {
            return null;
          }
        },
      },
      {
        name: 'GeckoTerminal',
        url: `https://api.geckoterminal.com/api/v2/networks/base/tokens/${TOKEN_ADDRESS}`,
        fetchPrice: async () => {
          try {
            const response = await axios.get(this.sources[2].url, { timeout: 5000 });
            if (response.data.data && response.data.data.attributes) {
              return parseFloat(response.data.data.attributes.price_usd);
            }
            return null;
          } catch {
            return null;
          }
        },
      },
      {
        name: 'Your API',
        url: process.env.API_URL || 'http://localhost:3000/api/price',
        fetchPrice: async () => {
          try {
            const response = await axios.get(this.sources[3].url, { timeout: 5000 });
            if (response.data.success) {
              return response.data.data.price;
            }
            return null;
          } catch {
            return null;
          }
        },
      },
    ];
  }

  async checkAllSources() {
    console.log('\n==============================================');
    console.log('QUANTA PRICE MONITOR');
    console.log('==============================================');
    console.log(`Time: ${new Date().toISOString()}\n`);

    const results: Array<{ source: string; price: number | null; status: string }> = [];

    for (const source of this.sources) {
      console.log(`Checking ${source.name}...`);
      const price = await source.fetchPrice();

      let status = '✓ OK';
      if (price === null) {
        status = '✗ UNAVAILABLE';
      }

      results.push({
        source: source.name,
        price,
        status,
      });

      console.log(`  ${status} - ${price ? '$' + price.toFixed(6) : 'N/A'}\n`);
    }

    // Calculate price consistency
    const validPrices = results.filter((r) => r.price !== null).map((r) => r.price!);

    if (validPrices.length > 1) {
      const avgPrice = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
      const maxDeviation = Math.max(
        ...validPrices.map((p) => Math.abs(p - avgPrice) / avgPrice)
      );

      console.log('==============================================');
      console.log('ANALYSIS');
      console.log('==============================================');
      console.log(`Average Price: $${avgPrice.toFixed(6)}`);
      console.log(`Max Deviation: ${(maxDeviation * 100).toFixed(2)}%`);

      if (maxDeviation > 0.05) {
        console.log('\n⚠️  WARNING: Price discrepancy detected!');
        console.log('Consider investigating sources with large deviations.');
      } else {
        console.log('\n✓ Price consistency looks good!');
      }
    }

    console.log('==============================================\n');

    return results;
  }

  async startContinuousMonitoring(intervalMinutes: number = 5) {
    console.log(`Starting continuous monitoring (every ${intervalMinutes} minutes)...`);
    console.log('Press Ctrl+C to stop.\n');

    // Initial check
    await this.checkAllSources();

    // Set up interval
    setInterval(async () => {
      await this.checkAllSources();
    }, intervalMinutes * 60 * 1000);
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new PriceMonitor();

  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous') || args.includes('-c');
  const intervalArg = args.find((arg) => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 5;

  if (continuous) {
    monitor.startContinuousMonitoring(interval);
  } else {
    monitor.checkAllSources().then(() => {
      console.log('Monitoring complete. Use --continuous flag for ongoing monitoring.');
    });
  }
}

export default PriceMonitor;
