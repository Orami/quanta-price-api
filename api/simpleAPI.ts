/**
 * Simple QUANTA Price API
 * Uses GeckoTerminal & DexScreener APIs for accurate pricing
 * NO complex on-chain reading - just reliable aggregator data!
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { SimplePriceService } from '../services/simplePriceService';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize price service
const priceService = new SimplePriceService();

// Cache for price data (refresh every 30 seconds)
let cachedPrice: any = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function getCachedPrice() {
  const now = Date.now();
  if (!cachedPrice || now - lastFetch > CACHE_DURATION) {
    try {
      cachedPrice = await priceService.getPrice();
      lastFetch = now;
    } catch (error: any) {
      console.error('Error fetching price:', error);
      if (!cachedPrice) throw error; // Only throw if we have no cached data
    }
  }
  return cachedPrice;
}

/**
 * GET /
 * API documentation
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'QUANTA Price API',
    version: '1.0.0',
    description: 'Simple, reliable price data for QUANTA token on Base',
    token: {
      address: '0x5acdc563450cc35055d7344287c327fafb2b371a',
      symbol: 'QUANTA',
      name: 'fun Quanta Sovereigna',
      chain: 'Base',
    },
    endpoints: {
      'GET /': 'This documentation',
      'GET /health': 'Health check',
      'GET /price': 'Current price (simple)',
      'GET /price/full': 'Detailed price data',
      'GET /price/all': 'All sources comparison',
      'GET /pool': 'Pool information',
    },
    links: {
      virtuals: 'https://app.virtuals.io/virtuals/7580',
      basescan: 'https://basescan.org/token/0x5acdc563450cc35055d7344287c327fafb2b371a',
      pool: 'https://geckoterminal.com/base/pools/0xd17616d20d81d6e2eaa8f6eca5583a28793da685',
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
    service: 'QUANTA Price API',
  });
});

/**
 * GET /price
 * Get current QUANTA price (simple response)
 */
app.get('/price', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      price: data.priceUSD,
      currency: 'USD',
      timestamp: data.timestamp,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /price/full
 * Get detailed price data
 */
app.get('/price/full', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      data: {
        price: {
          usd: data.priceUSD,
          change24h: data.priceChange24h,
        },
        liquidity: {
          usd: data.liquidityUSD,
        },
        volume: {
          h24: data.volume24h,
        },
        pool: {
          address: data.pool,
          source: data.source,
        },
        timestamp: data.timestamp,
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
 * GET /price/all
 * Get price from all sources for comparison
 */
app.get('/price/all', async (req: Request, res: Response) => {
  try {
    const data = await priceService.getAllPrices();
    res.json({
      success: true,
      data: {
        primary: data.primary,
        sources: data.sources,
        recommendation: data.recommendation,
        timestamp: Date.now(),
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
 * GET /pool
 * Get pool information
 */
app.get('/pool', async (req: Request, res: Response) => {
  try {
    const data = await getCachedPrice();
    res.json({
      success: true,
      data: {
        address: data.pool,
        pair: 'QUANTA/VIRTUAL',
        dex: 'Virtuals Protocol',
        chain: 'Base',
        liquidityUSD: data.liquidityUSD,
        volume24h: data.volume24h,
        source: data.source,
        links: {
          geckoterminal: `https://geckoterminal.com/base/pools/${data.pool}`,
          basescan: `https://basescan.org/address/${data.pool}`,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
  console.log('\n' + '='.repeat(60));
  console.log('🚀 QUANTA Price API - Running!');
  console.log('='.repeat(60));
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`\n📊 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/price`);
  console.log(`   GET  http://localhost:${PORT}/price/full`);
  console.log(`   GET  http://localhost:${PORT}/price/all`);
  console.log(`   GET  http://localhost:${PORT}/pool`);
  console.log('\n' + '='.repeat(60) + '\n');
});

export default app;
