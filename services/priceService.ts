/**
 * QUANTA Token Price Service
 * Fetches accurate price data from on-chain sources
 */

import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  QUANTA_TOKEN: '0x5aCdC563450Cc35055D7344287C327FAFb2B371A',
  ORACLE_CONTRACT: process.env.ORACLE_CONTRACT || '', // Deploy the oracle first
  // Add known pool addresses here
  POOLS: {
    VIRTUAL_QUANTA_V2: process.env.VIRTUAL_QUANTA_POOL || '', // QUANTA/VIRTUAL pool on Virtuals
  },
};

// ABIs
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
];

const ORACLE_ABI = [
  'function getAveragePrice() external view returns (uint256 avgPrice, uint256 totalLiquidity)',
  'function getBestPrice() external view returns (uint256 bestPrice)',
  'function getAllPools() external view returns (address[] _v2Pools, address[] _v3Pools)',
];

export class QuantaPriceService {
  private provider: ethers.Provider;

  constructor(rpcUrl: string = CONFIG.RPC_URL) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get price from a Uniswap V2 pair
   */
  async getPriceFromV2Pool(poolAddress: string): Promise<{
    price: number;
    priceInverted: number;
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
  }> {
    const pair = new ethers.Contract(poolAddress, UNISWAP_V2_PAIR_ABI, this.provider);

    const [reserve0, reserve1] = await pair.getReserves();
    const token0Address = await pair.token0();
    const token1Address = await pair.token1();

    const token0 = new ethers.Contract(token0Address, ERC20_ABI, this.provider);
    const token1 = new ethers.Contract(token1Address, ERC20_ABI, this.provider);

    const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
      token0.decimals(),
      token1.decimals(),
      token0.symbol(),
      token1.symbol(),
    ]);

    // Calculate prices
    const reserve0Formatted = Number(ethers.formatUnits(reserve0, decimals0));
    const reserve1Formatted = Number(ethers.formatUnits(reserve1, decimals1));

    const price = reserve1Formatted / reserve0Formatted;
    const priceInverted = reserve0Formatted / reserve1Formatted;

    return {
      price,
      priceInverted,
      token0: `${symbol0} (${token0Address})`,
      token1: `${symbol1} (${token1Address})`,
      reserve0: reserve0Formatted.toString(),
      reserve1: reserve1Formatted.toString(),
    };
  }

  /**
   * Get QUANTA price in USD (requires VIRTUAL/USD or WETH/USD price)
   */
  async getQuantaPriceUSD(): Promise<{
    priceUSD: number;
    source: string;
    timestamp: number;
  }> {
    try {
      // If oracle is deployed, use it
      if (CONFIG.ORACLE_CONTRACT) {
        const oracle = new ethers.Contract(CONFIG.ORACLE_CONTRACT, ORACLE_ABI, this.provider);
        const [avgPrice] = await oracle.getAveragePrice();
        const priceFormatted = Number(ethers.formatUnits(avgPrice, 18));

        return {
          priceUSD: priceFormatted,
          source: 'on-chain-oracle',
          timestamp: Date.now(),
        };
      }

      // Fallback: Calculate from pool directly
      if (CONFIG.POOLS.VIRTUAL_QUANTA_V2) {
        const poolData = await this.getPriceFromV2Pool(CONFIG.POOLS.VIRTUAL_QUANTA_V2);

        // Determine which is QUANTA
        const isToken0Quanta = poolData.token0.includes(CONFIG.QUANTA_TOKEN);
        const quantaPrice = isToken0Quanta ? poolData.price : poolData.priceInverted;

        // You'll need to multiply by VIRTUAL price to get USD
        // For now, return the price in VIRTUAL terms
        return {
          priceUSD: quantaPrice,
          source: 'QUANTA/VIRTUAL pool',
          timestamp: Date.now(),
        };
      }

      throw new Error('No price source configured');
    } catch (error) {
      console.error('Error fetching QUANTA price:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive price data
   */
  async getFullPriceData(): Promise<{
    price: number;
    priceChange24h?: number;
    volume24h?: number;
    liquidity: string;
    marketCap?: number;
    source: string;
    timestamp: number;
    pools: Array<{
      address: string;
      price: number;
      liquidity: string;
    }>;
  }> {
    const priceData = await this.getQuantaPriceUSD();

    // Get liquidity from pools
    const pools = [];
    if (CONFIG.POOLS.VIRTUAL_QUANTA_V2) {
      const poolData = await this.getPriceFromV2Pool(CONFIG.POOLS.VIRTUAL_QUANTA_V2);
      pools.push({
        address: CONFIG.POOLS.VIRTUAL_QUANTA_V2,
        price: poolData.price,
        liquidity: poolData.reserve0, // QUANTA reserve
      });
    }

    return {
      price: priceData.priceUSD,
      liquidity: pools.reduce((sum, p) => sum + Number(p.liquidity), 0).toString(),
      source: priceData.source,
      timestamp: priceData.timestamp,
      pools,
    };
  }

  /**
   * Find QUANTA liquidity pools on Base
   */
  async findQuantaPools(): Promise<string[]> {
    // This would need to scan for pools using factory contracts
    // For now, return configured pools
    return Object.values(CONFIG.POOLS).filter(Boolean);
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const service = new QuantaPriceService();

    console.log('Fetching QUANTA price data...\n');

    try {
      const fullData = await service.getFullPriceData();
      console.log('QUANTA Price Data:');
      console.log(JSON.stringify(fullData, null, 2));
    } catch (error) {
      console.error('Error:', error);
    }
  })();
}

export default QuantaPriceService;
