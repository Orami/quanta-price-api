# Setting Up Moralis for QUANTA Price Tracking

This guide shows you how to use your Moralis account to get accurate price data for FREE.

## 🎯 Why Use Moralis?

**The Problem:**
- Your $16k liquidity is in a QUANTA/VIRTUAL pool on Virtuals Protocol
- Standard aggregators (DexScreener, GeckoTerminal) struggle to index Virtuals Protocol pools
- They show data from tiny $3 USDC pools instead

**The Solution:**
- Moralis has direct access to all Base chain data
- Can read from Virtuals Protocol pools accurately
- Provides enterprise-grade API for FREE (up to 40k requests/day)

---

## 🚀 Step 1: Get Your Moralis API Key

If you don't have one yet:

1. Go to: https://admin.moralis.io/register
2. Sign up for free account
3. Go to: https://admin.moralis.io/web3apis
4. Copy your API key

**Free Tier Includes:**
- 40,000 requests per day
- Access to all EVM chains (including Base)
- Token price data
- Pool data
- Holder data

---

## 🛠️ Step 2: Configure Your Environment

```bash
cd /Users/mone/Documents/Quanta_Master

# Edit .env file
nano .env
```

Add your Moralis API key:
```env
MORALIS_API_KEY=YOUR_API_KEY_HERE
```

---

## 📦 Step 3: Install Dependencies

```bash
npm install
```

This installs:
- `moralis` - Moralis SDK
- `@moralisweb3/common-evm-utils` - EVM utilities
- `axios` - For HTTP requests

---

## ✅ Step 4: Test the Integration

### Test Price Fetching:

```bash
npm run price:moralis
```

This will show:
- Current QUANTA price in USD
- QUANTA price in VIRTUAL tokens
- All liquidity pools and their sizes
- Token metadata
- Top holders

### Expected Output:

```json
{
  "priceUSD": 0.000009216607347,
  "priceVIRTUAL": 0.0000108,
  "liquidity": 16000,
  "volume24h": 0,
  "source": "Moralis API",
  "pools": [
    {
      "pair": "QUANTA/VIRTUAL",
      "price": 0.000009216607347,
      "liquidity": 16000,
      "dex": "Virtuals Protocol"
    }
  ]
}
```

---

## 🌐 Step 5: Start the API Server

```bash
npm run start:moralis
```

Your API will be available at `http://localhost:3001`

### Available Endpoints:

**GET /api/price**
```bash
curl http://localhost:3001/api/price
```

Returns current price in USD and VIRTUAL.

**GET /api/price/full**
```bash
curl http://localhost:3001/api/price/full
```

Returns comprehensive data including all pools.

**GET /api/pools**
```bash
curl http://localhost:3001/api/pools
```

Returns liquidity pool information.

**GET /api/token**
```bash
curl http://localhost:3001/api/token
```

Returns complete token metadata.

**GET /api/holders**
```bash
curl http://localhost:3001/api/holders?limit=10
```

Returns top token holders.

---

## 🔍 Step 6: Find Your Virtuals Protocol Pool

We need to find the exact address of your QUANTA/VIRTUAL pool with $16k liquidity.

### Method 1: Check Virtuals.io

1. Go to: https://app.virtuals.io/virtuals/7580
2. Look for "Liquidity Pool Address" or similar
3. Copy the contract address

### Method 2: Check BaseScan

1. Go to: https://basescan.org/token/0x5aCdC563450Cc35055D7344287C327FAFb2B371A
2. Click "Holders" tab
3. Look for largest LP token holder (that's your pool)
4. Click on the address

### Method 3: Use Moralis API

Run this script:

```bash
node -e "
const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');

(async () => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

  const holders = await Moralis.EvmApi.token.getTokenOwners({
    chain: EvmChain.BASE,
    tokenAddress: '0x5aCdC563450Cc35055D7344287C327FAFb2B371A',
    limit: 10,
  });

  console.log(JSON.stringify(holders, null, 2));
})();
"
```

Once you find it, add to `.env`:
```env
QUANTA_VIRTUAL_POOL=0x...your_pool_address_here...
```

---

## 📊 Step 7: Submit to Aggregators

Now that you have accurate price data via Moralis:

### DexScreener

**Option A: Wait for Automatic Indexing**
- Make at least 1 transaction in your pool
- Wait 24-48 hours
- Should appear at: https://dexscreener.com/base/0x5acdc563450cc35055d7344287c327fafb2b371a

**Option B: Submit Manually**
- Go to: https://docs.dexscreener.com/token-listing
- Use their update form
- Provide your pool address

### GeckoTerminal

Already indexed! Your token shows at:
```
https://www.geckoterminal.com/base/pools/YOUR_POOL_ADDRESS
```

The issue is they're showing tiny pools. Once your main pool gets transactions, it will show properly.

### CoinGecko / CoinMarketCap

When you apply (after 30 days trading), provide your API URL:
```
https://your-domain.com/api/price
```

They'll use this to verify your price.

---

## 🎨 Step 8: Display Price on Your Website

### Simple HTML Example:

```html
<!DOCTYPE html>
<html>
<head>
    <title>QUANTA Price</title>
</head>
<body>
    <h1>$QUANTA Price</h1>
    <div id="price">Loading...</div>

    <script>
        async function updatePrice() {
            const response = await fetch('http://localhost:3001/api/price');
            const data = await response.json();

            document.getElementById('price').innerHTML = `
                <p>Price: $${data.data.priceUSD.toFixed(8)}</p>
                <p>In VIRTUAL: ${data.data.priceVIRTUAL.toFixed(6)} VIRTUAL</p>
            `;
        }

        updatePrice();
        setInterval(updatePrice, 30000); // Update every 30 seconds
    </script>
</body>
</html>
```

### React Example:

```tsx
import { useEffect, useState } from 'react';

function QuantaPrice() {
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    const fetchPrice = async () => {
      const res = await fetch('http://localhost:3001/api/price');
      const data = await res.json();
      setPrice(data.data.priceUSD);
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return <div>${price.toFixed(8)}</div>;
}
```

---

## 🚀 Step 9: Deploy to Production

### Option 1: Railway

1. Push code to GitHub
2. Go to: https://railway.app
3. Connect your repo
4. Add environment variables (including MORALIS_API_KEY)
5. Deploy

Railway will give you a URL like:
```
https://quanta-api.railway.app
```

### Option 2: Vercel

```bash
npm install -g vercel
vercel
```

Follow prompts and add MORALIS_API_KEY in dashboard.

### Option 3: Your Own Server

```bash
# On your server
git clone your-repo
cd Quanta_Master
npm install

# Set environment variables
export MORALIS_API_KEY=your_key_here

# Run with PM2
npm install -g pm2
pm2 start api/moralisAPI.ts --name quanta-api
pm2 save
pm2 startup
```

---

## 🔧 Troubleshooting

### "MORALIS_API_KEY not set"
- Make sure you added it to `.env`
- For npm scripts, it should auto-load from `.env`

### "Rate limit exceeded"
- Free tier: 40k requests/day
- Implement caching (already done - 30 second cache)
- Upgrade to paid plan if needed

### "Pool not found"
- Make sure QUANTA_VIRTUAL_POOL address is correct
- Check if pool is on Base chain
- Verify pool has liquidity

### "Price shows $0"
- Check that pool has recent transactions
- Verify pool is active on Virtuals Protocol
- Try accessing Virtuals.io directly to confirm

---

## 📈 Monitoring & Analytics

### Monitor Price in Terminal:

```bash
watch -n 30 'curl -s http://localhost:3001/api/price | jq'
```

### Track All Pools:

```bash
curl -s http://localhost:3001/api/pools | jq
```

### Get Holder Stats:

```bash
curl -s http://localhost:3001/api/holders?limit=20 | jq
```

---

## 💰 Cost Analysis

**Moralis Free Tier:**
- 40,000 requests per day
- That's 27 requests per minute
- More than enough for a price API

**If you exceed free tier:**
- Pro plan: $49/month (3M requests)
- Business plan: $249/month (15M requests)

**For reference:**
- 1 user checking price every 30 seconds = 2,880 requests/day
- Free tier supports ~14 active users

**With caching (built-in):**
- Cache refreshes every 30 seconds
- 1000 users × 1 request each = 1 cached response
- Easily supports thousands of users

---

## ✅ Success Checklist

- [ ] Moralis API key added to `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Price service tested (`npm run price:moralis`)
- [ ] API server running (`npm run start:moralis`)
- [ ] QUANTA/VIRTUAL pool address found
- [ ] Pool address added to `.env`
- [ ] API endpoints tested with curl/browser
- [ ] Considered deployment options
- [ ] Ready to submit to aggregators

---

## 🎉 You're Done!

You now have:
- ✅ Accurate price data from your real $16k pool
- ✅ Free API powered by Moralis
- ✅ No paid aggregator services needed
- ✅ Ready to display on your website
- ✅ Ready to submit to CoinGecko/CMC

**Next Steps:**
1. Get at least 1 transaction in your main pool
2. Wait 24-48h for automatic indexing
3. Monitor price across platforms
4. Deploy API to production for public access
