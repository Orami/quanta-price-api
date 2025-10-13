/**
 * QUANTA Price API Server
 * Provides REST endpoints for price data that aggregators can query
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { QuantaPriceService } from '../services/priceService';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize price service
const priceService = new QuantaPriceService();

// Cache for price data (refresh every 30 seconds)
let cachedPrice: any = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function getCachedPrice() {
  const now = Date.now();
  if (!cachedPrice || now - lastFetch > CACHE_DURATION) {
    cachedPrice = await priceService.getFullPriceData();
    lastFetch = now;
  }
  return cachedPrice;
}

/**
 * GET /api/price
 * Get current QUANTA price
 */
app.get('/api/price', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      data: {
        symbol: 'QUANTA',
        price: data.price,
        timestamp: data.timestamp,
        source: data.source,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/price/full
 * Get comprehensive price data
 */
app.get('/api/price/full', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/pools
 * Get all liquidity pools
 */
app.get('/api/pools', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      data: {
        pools: data.pools,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/token
 * Get token metadata (for DEX aggregators)
 */
app.get('/api/token', async (req: Request, res: Response) => {
  const data = await getCachedPrice();

  res.json({
    address: '0x5aCdC563450Cc35055D7344287C327FAFb2B371A',
    name: 'Quanta',
    symbol: 'QUANTA',
    decimals: 18,
    chain: 'base',
    chainId: 8453,
    price: data.price,
    liquidity: data.liquidity,
    pools: data.pools.map((p: any) => ({
      address: p.address,
      dex: 'uniswap-v2', // Update based on actual DEX
      pair: 'QUANTA/VIRTUAL',
    })),
    links: {
      website: process.env.WEBSITE_URL || '',
      twitter: process.env.TWITTER_URL || '',
      telegram: process.env.TELEGRAM_URL || '',
    },
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`QUANTA Price API running on port ${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`  - GET http://localhost:${PORT}/api/price`);
  console.log(`  - GET http://localhost:${PORT}/api/price/full`);
  console.log(`  - GET http://localhost:${PORT}/api/pools`);
  console.log(`  - GET http://localhost:${PORT}/api/token`);
  console.log(`  - GET http://localhost:${PORT}/health`);
});

export default app;
