/**
 * Direct Pool Price Reader
 * Reads price directly from pool contracts on Base
 * Works with standard Uniswap V2 pools including Virtuals Protocol
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const CONFIG = {
  RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  QUANTA_TOKEN: '0x5acdc563450cc35055d7344287c327fafb2b371a',
  VIRTUAL_TOKEN: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b',
  USDC_TOKEN: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  // Pool addresses - we'll find these
  POOLS: {
    QUANTA_VIRTUAL: process.env.QUANTA_VIRTUAL_POOL?.toLowerCase() || '',
    QUANTA_USDC: '0xa62ceb34708e2ecef26fb79feec271ae2e388a07',
  },
};

// Minimal ABIs
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function balanceOf(address account) external view returns (uint256)',
];

interface PoolData {
  address: string;
  token0: { address: string; symbol: string; decimals: number; reserve: string };
  token1: { address: string; symbol: string; decimals: number; reserve: string };
  quantaPrice: number;
  quantaPriceUSD?: number;
  liquidityUSD: number;
}

export class DirectPriceService {
  private provider: ethers.Provider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  }

  /**
   * Read reserves from a Uniswap V2 style pool
   */
  async getPoolData(poolAddress: string): Promise<PoolData | null> {
    try {
      const pair = new ethers.Contract(poolAddress, PAIR_ABI, this.provider);

      // Get pool info
      const [reserves, token0Address, token1Address] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
        pair.token1(),
      ]);

      // Get token info
      const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, this.provider);
      const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, this.provider);

      const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
        token0Contract.symbol(),
        token1Contract.symbol(),
        token0Contract.decimals(),
        token1Contract.decimals(),
      ]);

      const reserve0 = reserves[0];
      const reserve1 = reserves[1];

      // Format reserves
      const reserve0Formatted = ethers.formatUnits(reserve0, decimals0);
      const reserve1Formatted = ethers.formatUnits(reserve1, decimals1);

      // Calculate price
      const isToken0Quanta = token0Address.toLowerCase() === CONFIG.QUANTA_TOKEN;
      const quantaPrice = isToken0Quanta
        ? Number(reserve1Formatted) / Number(reserve0Formatted)
        : Number(reserve0Formatted) / Number(reserve1Formatted);

      const quantaReserve = isToken0Quanta ? reserve0Formatted : reserve1Formatted;

      return {
        address: poolAddress,
        token0: {
          address: token0Address,
          symbol: symbol0,
          decimals: decimals0,
          reserve: reserve0Formatted,
        },
        token1: {
          address: token1Address,
          symbol: symbol1,
          decimals: decimals1,
          reserve: reserve1Formatted,
        },
        quantaPrice,
        liquidityUSD: 0, // Calculate below if we know USD price
      };
    } catch (error) {
      console.error(`Error reading pool ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Get VIRTUAL token price in USD from a known DEX
   */
  async getVirtualPriceUSD(): Promise<number> {
    try {
      // Query DexScreener API for VIRTUAL price
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${CONFIG.VIRTUAL_TOKEN}`
      );
      const data: any = await response.json();

      if (data.pairs && data.pairs.length > 0) {
        // Get the pair with most liquidity
        const bestPair = data.pairs.sort((a: any, b: any) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        return parseFloat(bestPair.priceUsd) || 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching VIRTUAL price:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive QUANTA price data
   */
  async getQuantaPrice(): Promise<{
    priceUSD: number;
    priceVIRTUAL?: number;
    pools: PoolData[];
    bestPool: PoolData | null;
    totalLiquidity: number;
    timestamp: number;
  }> {
    const pools: PoolData[] = [];

    // Get VIRTUAL price first
    const virtualPriceUSD = await this.getVirtualPriceUSD();
    console.log(`VIRTUAL price: $${virtualPriceUSD.toFixed(4)}`);

    // Read QUANTA/VIRTUAL pool
    if (CONFIG.POOLS.QUANTA_VIRTUAL) {
      console.log(`\nReading QUANTA/VIRTUAL pool: ${CONFIG.POOLS.QUANTA_VIRTUAL}`);
      const poolData = await this.getPoolData(CONFIG.POOLS.QUANTA_VIRTUAL);
      if (poolData) {
        // Calculate USD value
        poolData.quantaPriceUSD = poolData.quantaPrice * virtualPriceUSD;
        poolData.liquidityUSD = Number(
          poolData.token0.address.toLowerCase() === CONFIG.QUANTA_TOKEN
            ? poolData.token0.reserve
            : poolData.token1.reserve
        ) * poolData.quantaPriceUSD * 2; // *2 for both sides

        pools.push(poolData);
        console.log(`  ✓ QUANTA price: ${poolData.quantaPrice.toFixed(8)} VIRTUAL`);
        console.log(`  ✓ QUANTA price: $${poolData.quantaPriceUSD.toFixed(10)}`);
        console.log(`  ✓ Liquidity: $${poolData.liquidityUSD.toFixed(2)}`);
      }
    }

    // Read QUANTA/USDC pool
    console.log(`\nReading QUANTA/USDC pool: ${CONFIG.POOLS.QUANTA_USDC}`);
    const usdcPoolData = await this.getPoolData(CONFIG.POOLS.QUANTA_USDC);
    if (usdcPoolData) {
      usdcPoolData.quantaPriceUSD = usdcPoolData.quantaPrice; // Already in USD
      usdcPoolData.liquidityUSD = Number(
        usdcPoolData.token0.address.toLowerCase() === CONFIG.QUANTA_TOKEN
          ? usdcPoolData.token0.reserve
          : usdcPoolData.token1.reserve
      ) * usdcPoolData.quantaPriceUSD * 2;

      pools.push(usdcPoolData);
      console.log(`  ✓ QUANTA price: $${usdcPoolData.quantaPriceUSD.toFixed(10)}`);
      console.log(`  ✓ Liquidity: $${usdcPoolData.liquidityUSD.toFixed(2)}`);
    }

    // Find best pool (highest liquidity)
    const bestPool = pools.reduce((best, pool) =>
      (pool.liquidityUSD > (best?.liquidityUSD || 0)) ? pool : best
    , null as PoolData | null);

    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidityUSD, 0);

    // Use best pool for price
    const priceUSD = bestPool?.quantaPriceUSD || 0;
    const priceVIRTUAL = pools.find(p =>
      p.token0.symbol === 'VIRTUAL' || p.token1.symbol === 'VIRTUAL'
    )?.quantaPrice;

    return {
      priceUSD,
      priceVIRTUAL,
      pools,
      bestPool,
      totalLiquidity,
      timestamp: Date.now(),
    };
  }

  /**
   * Find pool address by searching for QUANTA holders
   */
  async findQuantaPools(): Promise<string[]> {
    try {
      const response = await fetch(
        `https://api.basescan.org/api?module=token&action=tokenholderlist&contractaddress=${CONFIG.QUANTA_TOKEN}&page=1&offset=10`
      );
      const data: any = await response.json();

      if (data.status === '1' && data.result) {
        // Filter for addresses that might be pools (high balance)
        const potentialPools = data.result
          .filter((holder: any) => parseFloat(holder.TokenHolderQuantity) > 1000000)
          .map((holder: any) => holder.TokenHolderAddress);

        return potentialPools;
      }
    } catch (error) {
      console.error('Error finding pools:', error);
    }

    return [];
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const service = new DirectPriceService();

    console.log('=' .repeat(60));
    console.log('QUANTA Price Reader - Direct from Pool Contracts');
    console.log('='.repeat(60) + '\n');

    try {
      const data = await service.getQuantaPrice();

      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));
      console.log(`\nBest Price (from highest liquidity pool):`);
      console.log(`  💰 $${data.priceUSD.toFixed(10)} USD`);
      if (data.priceVIRTUAL) {
        console.log(`  🔷 ${data.priceVIRTUAL.toFixed(8)} VIRTUAL`);
      }
      console.log(`\nTotal Liquidity: $${data.totalLiquidity.toFixed(2)}`);
      console.log(`Pools Found: ${data.pools.length}`);

      if (data.bestPool) {
        console.log(`\nBest Pool: ${data.bestPool.token0.symbol}/${data.bestPool.token1.symbol}`);
        console.log(`  Address: ${data.bestPool.address}`);
        console.log(`  Liquidity: $${data.bestPool.liquidityUSD.toFixed(2)}`);
      }

      console.log('\n' + '='.repeat(60) + '\n');
    } catch (error) {
      console.error('Error:', error);
    }
  })();
}

export default DirectPriceService;
