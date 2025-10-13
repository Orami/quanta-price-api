# Submitting $QUANTA to DEX Aggregators

This guide covers how to submit your $QUANTA token to major DEX aggregators and price tracking platforms.

## Prerequisites

Before submitting to aggregators, ensure you have:

- ✅ Deployed liquidity pool(s) on Base
- ✅ At least one transaction in the pool
- ✅ Token metadata prepared (see `metadata/token-metadata.json`)
- ✅ Logo/icon image (256x256 PNG recommended)
- ✅ Social media links and website

## 1. DexScreener

**Automatic Listing:**
DexScreener automatically indexes all tokens with liquidity pools on Base.

**Access your token:**
```
https://dexscreener.com/base/0x5acdc563450cc35055d7344287c327fafb2b371a
```

**Enhanced Listing (Optional - Paid):**
- Visit: https://docs.dexscreener.com/token-listing
- Purchase "Enhanced Token Info" from marketplace
- Upload logo, description, and social links

**Requirements:**
- Active liquidity pool
- At least 1 transaction in last 24h
- Minimum liquidity: ~$1000 USD

---

## 2. GeckoTerminal (CoinGecko)

**Automatic Indexing:**
GeckoTerminal automatically indexes Base tokens with sufficient liquidity.

**Manual Submission (for faster indexing):**

1. Visit: https://www.geckoterminal.com/request-network-dex
2. Fill out the form:
   - Network: Base
   - Token Address: `0x5aCdC563450Cc35055D7344287C327FAFb2B371A`
   - Pool Address: [Your pool address]
   - DEX Name: [Your DEX - e.g., Uniswap V2]

**View your token:**
```
https://www.geckoterminal.com/base/pools/[your-pool-address]
```

---

## 3. CoinGecko (Full Listing)

For a comprehensive listing on CoinGecko (not just terminal):

1. Visit: https://www.coingecko.com/en/coins/new
2. Create account if needed
3. Submit application with:
   - Contract address: `0x5aCdC563450Cc35055D7344287C327FAFb2B371A`
   - Project information
   - Trading volume proof
   - Community links
   - Whitepaper/documentation

**Requirements:**
- Active trading for 30+ days
- Sufficient liquidity ($10k+ recommended)
- Active community
- Professional documentation

---

## 4. CoinMarketCap

1. Visit: https://coinmarketcap.com/request/
2. Create account
3. Fill "Add Cryptoasset" form:
   - Blockchain: Base
   - Contract: `0x5aCdC563450Cc35055D7344287C327FAFb2B371A`
   - Market pairs information
   - Project details

**Requirements:**
- Public API endpoint (use the price API we built)
- Trading on listed exchange
- Verifiable volume
- Working website

---

## 5. DEXTools

**Automatic Listing:**
DEXTools automatically indexes Base tokens.

**Access your token:**
```
https://www.dextools.io/app/base/pair-explorer/[your-pool-address]
```

**Paid Features:**
- Verified badge
- Enhanced info
- Marketing tools

Visit: https://www.dextools.io/app/en/pairs

---

## 6. Birdeye (Solana-focused but supports Base)

1. Visit: https://birdeye.so/
2. Search for Base tokens
3. Token appears automatically if indexed

---

## 7. Submit to Virtuals Protocol Directory

Since your token is integrated with Virtuals Protocol:

1. Ensure proper integration on https://app.virtuals.io
2. Contact Virtuals team for featured listing
3. Provide token metadata and pool information

---

## Setting Up Price API for Aggregators

Many aggregators request a public API endpoint. We've built one for you!

**Deploy the API:**

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your pool addresses

# Start the API
npm start
```

**API Endpoints:**
- `GET /api/price` - Current price
- `GET /api/price/full` - Comprehensive data
- `GET /api/token` - Token metadata

**For submissions, provide:**
```
API URL: https://your-domain.com/api/price
```

---

## Common Submission Checklist

Use this checklist when submitting to each platform:

- [ ] Token name: **Quanta**
- [ ] Symbol: **QUANTA**
- [ ] Contract: **0x5aCdC563450Cc35055D7344287C327FAFb2B371A**
- [ ] Chain: **Base (8453)**
- [ ] Decimals: **18**
- [ ] Logo/icon (256x256 PNG)
- [ ] Website URL
- [ ] Twitter/X handle
- [ ] Telegram group
- [ ] Pool address(es)
- [ ] DEX information (Uniswap V2/V3, etc.)
- [ ] Liquidity amount
- [ ] Price API endpoint (optional)

---

## Monitoring After Submission

After submitting to aggregators, monitor:

1. **Price Accuracy:** Check if displayed price matches on-chain data
2. **Volume Tracking:** Verify 24h volume is accurate
3. **Liquidity Display:** Ensure TVL is correct
4. **Chart Data:** Confirm price charts are working

Use the monitoring script:
```bash
npm run monitor
```

---

## Troubleshooting

**Token not appearing on aggregators:**
- Ensure pool has at least 1 transaction
- Check minimum liquidity requirements met
- Wait 24-48 hours for automatic indexing
- Verify contract is not flagged/blacklisted

**Incorrect price showing:**
- Use the price oracle we built
- Contact aggregator support with correct API
- Provide liquidity pool addresses
- Show proof of correct price from BaseScan

**Low liquidity warnings:**
- Add more liquidity to pool
- Consider multi-pool strategy
- Market your token to increase trading

---

## Support

If you encounter issues:

1. Check aggregator documentation
2. Contact aggregator support directly
3. Join their Discord/Telegram for help
4. Provide proof of legitimate project

---

## Next Steps

After submissions:

1. ✅ Monitor price accuracy across platforms (use monitoring script)
2. ✅ Engage with community to drive trading volume
3. ✅ Regular updates to ensure data stays accurate
4. ✅ Consider applying for "verified" badges
5. ✅ Keep social media active and updated
