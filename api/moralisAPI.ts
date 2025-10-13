/**
 * QUANTA Price API Using Moralis
 * Provides accurate price data from Virtuals Protocol pools
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { MoralisPriceService } from '../services/moralisPriceService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Moralis price service
const priceService = new MoralisPriceService();

// Cache for price data
let cachedPrice: any = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function getCachedPrice() {
  const now = Date.now();
  if (!cachedPrice || now - lastFetch > CACHE_DURATION) {
    try {
      cachedPrice = await priceService.getFullPriceData();
      lastFetch = now;
    } catch (error: any) {
      console.error('Error fetching price:', error);
      if (!cachedPrice) throw error; // Only throw if we have no cached data
    }
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
        priceUSD: data.priceUSD,
        priceVIRTUAL: data.priceVIRTUAL,
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
        totalLiquidity: data.liquidity,
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
 * Get token metadata
 */
app.get('/api/token', async (req: Request, res: Response) => {
  try {
    const [priceData, metadata] = await Promise.all([
      getCachedPrice(),
      priceService.getTokenMetadata(),
    ]);

    res.json({
      address: '0x5aCdC563450Cc35055D7344287C327FAFb2B371A',
      name: 'fun Quanta Sovereigna',
      symbol: 'QUANTA',
      decimals: 18,
      chain: 'base',
      chainId: 8453,
      price: priceData.priceUSD,
      priceVIRTUAL: priceData.priceVIRTUAL,
      liquidity: priceData.liquidity,
      pools: priceData.pools,
      metadata,
      links: {
        virtuals: 'https://app.virtuals.io/virtuals/7580',
        basescan: 'https://basescan.org/token/0x5aCdC563450Cc35055D7344287C327FAFb2B371A',
        website: process.env.WEBSITE_URL || '',
        twitter: process.env.TWITTER_URL || '',
        telegram: process.env.TELEGRAM_URL || '',
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
 * GET /api/holders
 * Get top token holders
 */
app.get('/api/holders', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const holders = await priceService.getTokenHolders(limit);
    res.json({
      success: true,
      data: holders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'QUANTA Moralis Price API',
  });
});

/**
 * GET /
 * API documentation
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'QUANTA Price API',
    version: '1.0.0',
    description: 'Accurate price data for QUANTA token using Moralis',
    endpoints: {
      'GET /api/price': 'Get current price',
      'GET /api/price/full': 'Get comprehensive price data',
      'GET /api/pools': 'Get all liquidity pools',
      'GET /api/token': 'Get token metadata',
      'GET /api/holders': 'Get token holders',
      'GET /health': 'Health check',
    },
    documentation: 'https://docs.moralis.io',
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`QUANTA Moralis Price API`);
  console.log(`${'='.repeat(50)}\n`);
  console.log(`Server running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  - http://localhost:${PORT}/`);
  console.log(`  - http://localhost:${PORT}/api/price`);
  console.log(`  - http://localhost:${PORT}/api/price/full`);
  console.log(`  - http://localhost:${PORT}/api/pools`);
  console.log(`  - http://localhost:${PORT}/api/token`);
  console.log(`  - http://localhost:${PORT}/api/holders`);
  console.log(`  - http://localhost:${PORT}/health`);
  console.log(`\n${'='.repeat(50)}\n`);
});

export default app;
