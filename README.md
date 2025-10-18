# QUANTA Token Price Oracle & API

Complete solution for accurate $QUANTA token price tracking on Base network.

## ✅ **DEPLOYMENT STATUS - LIVE**

**Last Updated**: October 18, 2025

**Oracle Contract**: [0xA706A744690bb6c2E3C3323E5e6682765285284C](https://basescan.org/address/0xA706A744690bb6c2E3C3323E5e6682765285284C)
**API Server**: Running on http://localhost:3000
**Current Price**: $0.0000067719 USD
**Total Liquidity**: $7,093 (961.6M QUANTA on Virtuals.io)
**Status**: 🟢 **Fully Operational**

## 🎯 Problem

Your $QUANTA token price is only accurate on Virtuals.io. Other platforms (DexScreener, GeckoTerminal, etc.) show incorrect or missing prices due to low liquidity.

## 🛠️ Solution

This project provides:

1. **Solidity Price Oracle** - Reads accurate price from on-chain liquidity pools
2. **TypeScript Price Service** - Fetches and calculates prices from multiple sources
3. **REST API** - Public endpoints for price data that aggregators can consume
4. **Monitoring Tools** - Track price accuracy across platforms
5. **Submission Guide** - Step-by-step instructions for DEX aggregators

---

## 📦 Installation

```bash
# Clone or navigate to the project directory
cd Quanta_Master

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

---

## ⚙️ Configuration

Edit `.env` with your values:

```env
# Base RPC URL
BASE_RPC_URL=https://mainnet.base.org

# Your QUANTA/VIRTUAL liquidity pool address
VIRTUAL_QUANTA_POOL=0x...

# API server port
PORT=3000

# After deployment, add oracle address:
ORACLE_CONTRACT=0x...

# For deployment
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
```

### Finding Your Pool Address

1. Go to https://app.virtuals.io/virtuals/7580
2. Look for the liquidity pool address
3. Or check BaseScan for QUANTA token holders - largest LP token holder is your pool

---

## 🚀 Quick Start

### Step 1: Deploy the Oracle Contract

```bash
# Compile contracts
npx hardhat compile

# Deploy to Base
npx hardhat run scripts/deploy.ts --network base

# Copy the deployed address to .env as ORACLE_CONTRACT
```

### Step 2: Add Liquidity Pools

```bash
# Edit scripts/addPools.ts and add your pool addresses
# Then run:
npx hardhat run scripts/addPools.ts --network base
```

### Step 3: Start the Price API

```bash
# Start the server
npm start

# Or for development with auto-reload:
npm run dev
```

Your API will be available at `http://localhost:3000`

### Step 4: Test Price Fetching

```bash
# Test the price service
npm run price

# Monitor prices across platforms
node scripts/monitor.ts

# Or continuous monitoring
node scripts/monitor.ts --continuous --interval=5
```

---

## 📡 API Endpoints

Once running, your API provides:

### GET /api/price
Get current QUANTA price
```bash
curl http://localhost:3000/api/price
```

Response:
```json
{
  "success": true,
  "data": {
    "symbol": "QUANTA",
    "price": 0.000123,
    "timestamp": 1704067200000,
    "source": "on-chain-oracle"
  }
}
```

### GET /api/price/full
Get comprehensive price data
```bash
curl http://localhost:3000/api/price/full
```

### GET /api/pools
Get all liquidity pools
```bash
curl http://localhost:3000/api/pools
```

### GET /api/token
Get token metadata (for aggregators)
```bash
curl http://localhost:3000/api/token
```

---

## 📊 Monitoring

Monitor price accuracy across platforms:

```bash
# Single check
node scripts/monitor.ts

# Continuous monitoring (every 5 minutes)
node scripts/monitor.ts --continuous

# Custom interval (every 10 minutes)
node scripts/monitor.ts --continuous --interval=10
```

Output shows:
- On-chain oracle price (ground truth)
- DexScreener price
- GeckoTerminal price
- Your API price
- Price deviation analysis

---

## 🎯 Submitting to DEX Aggregators

See detailed guide: `docs/DEX_AGGREGATOR_SUBMISSION.md`

### Quick Checklist:

1. **DexScreener** - Automatic (just wait 24h with >1 transaction)
   - Or buy enhanced listing: https://marketplace.dexscreener.com

2. **GeckoTerminal** - Submit pool info
   - https://www.geckoterminal.com/request-network-dex

3. **CoinGecko** - Full application
   - https://www.coingecko.com/en/coins/new

4. **CoinMarketCap** - Application with API
   - https://coinmarketcap.com/request/

5. **DEXTools** - Automatic
   - https://www.dextools.io/app/base

---

## 📁 Project Structure

```
Quanta_Master/
├── contracts/
│   └── QuantaPriceOracle.sol      # Solidity oracle contract
├── services/
│   └── priceService.ts             # Price fetching service
├── api/
│   └── priceAPI.ts                 # REST API server
├── scripts/
│   ├── deploy.ts                   # Deployment script
│   ├── addPools.ts                 # Add pools to oracle
│   └── monitor.ts                  # Price monitoring tool
├── metadata/
│   └── token-metadata.json         # Token info for submissions
├── docs/
│   └── DEX_AGGREGATOR_SUBMISSION.md # Submission guide
├── hardhat.config.ts               # Hardhat configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
└── .env.example                    # Environment template
```

---

## 🔧 Troubleshooting

### "No price source configured"
- Make sure you've added your pool address to `.env`
- Or deploy and configure the oracle contract

### "Request failed with status 403"
- Some aggregator APIs may block requests
- Use VPN or wait and retry
- Not critical - your on-chain oracle is the source of truth

### "Price still wrong on DexScreener"
- Ensure pool has transactions in last 24h
- Wait 24-48h for automatic indexing
- Consider buying enhanced listing for immediate update

### "Oracle returns 0"
- Check that pools were added correctly: `oracle.getAllPools()`
- Verify pool addresses are correct
- Ensure pool has liquidity

---

## 🌐 Deploying the API

To make your API publicly accessible for aggregators:

### Option 1: Railway (Recommended)
1. Push code to GitHub
2. Connect Railway to your repo
3. Set environment variables
4. Deploy

### Option 2: Vercel
```bash
npm install -g vercel
vercel
```

### Option 3: Your Own Server
```bash
# On your server
git clone your-repo
cd Quanta_Master
npm install
npm start

# Use PM2 for production
npm install -g pm2
pm2 start api/priceAPI.ts --name quanta-api
```

---

## 📈 Improving Price Accuracy

To get the most accurate price:

1. **Increase Liquidity** - More liquidity = better price discovery
2. **Multiple Pools** - Add pools on different DEXes
3. **More Transactions** - Drive volume through marketing
4. **Oracle Updates** - Keep oracle pools list updated
5. **Monitor Regularly** - Use monitoring script to catch issues

---

## 🤝 Support

- Check `docs/` folder for detailed guides
- Review your pool on BaseScan
- Contact Virtuals Protocol support for platform issues
- Open an issue if you need help with this code

---

## 📝 License

MIT

---

## ⚡ Quick Commands Reference

```bash
# Installation
npm install

# Deploy oracle
npx hardhat run scripts/deploy.ts --network base

# Add pools to oracle
npx hardhat run scripts/addPools.ts --network base

# Verify contract
npx hardhat verify --network base <ORACLE_ADDRESS>

# Start API
npm start

# Test price
npm run price

# Monitor prices
node scripts/monitor.ts --continuous

# Development
npm run dev
```

---

## 🎉 Success Checklist

- [x] **Oracle deployed and verified on Base** ✅
  - Contract: `0xA706A744690bb6c2E3C3323E5e6682765285284C`
  - Verified on BaseScan
  - Supports Uniswap V2, V3, and Virtuals.io pools
- [x] **Pools added to oracle** ✅
  - Virtuals.io: `0xd17616d20d81d6e2eaa8f6eca5583a28793da685` (Primary)
  - Uniswap V3 QUANTA/USDC: `0xa62ceb34708e2ecef26fb79feec271ae2e388a07`
  - Uniswap V3 QUANTA/VIRTUAL: `0x5a26834696cf820bcca40ec159e7278d9736858f`
- [x] **API running and accessible** ✅
  - Local server on port 3000
  - All endpoints functional
- [x] **Price monitoring shows accurate data** ✅
  - Oracle price: $0.0000065 USD
  - API price: $0.0000068 USD
  - Working perfectly
- [ ] Submitted to DexScreener
  - Token visible but needs enhanced listing for accurate price
- [ ] Submitted to GeckoTerminal
  - Token indexed, showing in search
- [ ] Applied to CoinGecko (if eligible)
- [ ] Applied to CoinMarketCap (if eligible)
- [ ] Price accurate across platforms (within 5%)
  - Currently showing on aggregators but with low liquidity warnings

---

**Need Help?** Check the docs folder or open an issue!
