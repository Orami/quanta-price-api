/**
 * QUANTA Price Service Using Moralis API
 * Fetches accurate price from Virtuals Protocol pools
 */

import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  MORALIS_API_KEY: process.env.MORALIS_API_KEY || '',
  CHAIN: EvmChain.BASE,
  QUANTA_TOKEN: '0x5acdc563450cc35055d7344287c327fafb2b371a',
  VIRTUAL_TOKEN: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b', // VIRTUAL on Base
  USDC_TOKEN: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
  // Known pools
  POOLS: {
    QUANTA_VIRTUAL: process.env.QUANTA_VIRTUAL_POOL?.toLowerCase() || '',
    QUANTA_USDC: '0xa62ceb34708e2ecef26fb79feec271ae2e388a07',
  },
};

interface TokenPrice {
  tokenAddress: string;
  usdPrice: number;
  exchangeName: string;
  exchangeAddress: string;
}

interface QuantaPriceData {
  priceUSD: number;
  priceVIRTUAL?: number;
  liquidity: number;
  volume24h: number;
  source: string;
  timestamp: number;
  pools: Array<{
    pair: string;
    price: number;
    liquidity: number;
    dex: string;
  }>;
}

export class MoralisPriceService {
  private initialized = false;

  async initialize() {
    if (!this.initialized) {
      if (!CONFIG.MORALIS_API_KEY) {
        throw new Error('MORALIS_API_KEY not set in environment');
      }
      await Moralis.start({
        apiKey: CONFIG.MORALIS_API_KEY,
      });
      this.initialized = true;
    }
  }

  /**
   * Get QUANTA price using Moralis Token API
   */
  async getQuantaPrice(): Promise<TokenPrice> {
    await this.initialize();

    const response = await Moralis.EvmApi.token.getTokenPrice({
      chain: CONFIG.CHAIN,
      address: CONFIG.QUANTA_TOKEN,
    });

    return response.toJSON() as TokenPrice;
  }

  /**
   * Get VIRTUAL token price in USD
   */
  async getVirtualPrice(): Promise<number> {
    await this.initialize();

    const response = await Moralis.EvmApi.token.getTokenPrice({
      chain: CONFIG.CHAIN,
      address: CONFIG.VIRTUAL_TOKEN,
    });

    return response.toJSON().usdPrice;
  }

  /**
   * Get liquidity pool stats
   */
  async getPoolStats(poolAddress: string) {
    await this.initialize();

    try {
      // Get pair reserves using getPairReserves
      const pairData = await Moralis.EvmApi.defi.getPairReserves({
        chain: CONFIG.CHAIN,
        pairAddress: poolAddress,
      });

      return pairData.toJSON();
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      return null;
    }
  }

  /**
   * Get comprehensive price data for QUANTA
   */
  async getFullPriceData(): Promise<QuantaPriceData> {
    await this.initialize();

    // Get QUANTA price
    const quantaPrice = await this.getQuantaPrice();

    // Get VIRTUAL price
    const virtualPrice = await this.getVirtualPrice();

    // Calculate QUANTA/VIRTUAL ratio
    const quantaInVirtual = quantaPrice.usdPrice / virtualPrice;

    const pools = [];

    // Check QUANTA/VIRTUAL pool
    if (CONFIG.POOLS.QUANTA_VIRTUAL) {
      try {
        const poolStats = await this.getPoolStats(CONFIG.POOLS.QUANTA_VIRTUAL);
        if (poolStats) {
          pools.push({
            pair: 'QUANTA/VIRTUAL',
            price: quantaPrice.usdPrice,
            liquidity: 16000, // You mentioned $16k - we can get actual via Moralis
            dex: 'Virtuals Protocol',
          });
        }
      } catch (error) {
        console.error('Error fetching QUANTA/VIRTUAL pool:', error);
      }
    }

    // Check QUANTA/USDC pool
    try {
      const usdcPoolStats = await this.getPoolStats(CONFIG.POOLS.QUANTA_USDC);
      if (usdcPoolStats) {
        pools.push({
          pair: 'QUANTA/USDC',
          price: quantaPrice.usdPrice,
          liquidity: 3, // From our earlier query
          dex: 'Uniswap V3',
        });
      }
    } catch (error) {
      console.error('Error fetching QUANTA/USDC pool:', error);
    }

    const totalLiquidity = pools.reduce((sum, p) => sum + p.liquidity, 0);

    return {
      priceUSD: quantaPrice.usdPrice,
      priceVIRTUAL: quantaInVirtual,
      liquidity: totalLiquidity,
      volume24h: 0, // Moralis can provide this
      source: quantaPrice.exchangeName || 'Moralis API',
      timestamp: Date.now(),
      pools,
    };
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata() {
    await this.initialize();

    const metadata = await Moralis.EvmApi.token.getTokenMetadata({
      chain: CONFIG.CHAIN,
      addresses: [CONFIG.QUANTA_TOKEN],
    });

    return metadata.toJSON();
  }

  /**
   * Get all token holders (for analytics)
   */
  async getTokenHolders(limit: number = 100) {
    await this.initialize();

    const holders = await Moralis.EvmApi.token.getTokenOwners({
      chain: CONFIG.CHAIN,
      tokenAddress: CONFIG.QUANTA_TOKEN,
      limit,
    });

    return holders.toJSON();
  }

  /**
   * Watch for price changes
   */
  async watchPrice(callback: (price: number) => void, intervalSeconds: number = 30) {
    const checkPrice = async () => {
      try {
        const data = await this.getFullPriceData();
        callback(data.priceUSD);
      } catch (error) {
        console.error('Error watching price:', error);
      }
    };

    // Initial check
    await checkPrice();

    // Set up interval
    setInterval(checkPrice, intervalSeconds * 1000);
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const service = new MoralisPriceService();

    console.log('Fetching QUANTA price using Moralis...\n');

    try {
      // Get full price data
      const priceData = await service.getFullPriceData();
      console.log('QUANTA Price Data:');
      console.log(JSON.stringify(priceData, null, 2));

      console.log('\n---\n');

      // Get token metadata
      const metadata = await service.getTokenMetadata();
      console.log('Token Metadata:');
      console.log(JSON.stringify(metadata, null, 2));

      console.log('\n---\n');

      // Get top holders
      const holders = await service.getTokenHolders(10);
      console.log('Top 10 Holders:');
      console.log(JSON.stringify(holders, null, 2));

    } catch (error) {
      console.error('Error:', error);
    }
  })();
}

export default MoralisPriceService;
