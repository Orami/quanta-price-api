import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function main() {
  console.log('============================================================');
  console.log('QUANTA Rate Provider Deployment');
  console.log('============================================================\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  if (balance < ethers.parseEther('0.005')) {
    console.warn('⚠️  WARNING: Balance is low. You may need at least 0.01 ETH for deployment.\n');
  }

  // Get Railway API URL
  const apiUrl = process.env.RAILWAY_PUBLIC_URL || process.env.PRICE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'Please set RAILWAY_PUBLIC_URL or PRICE_API_URL in your .env file\n' +
      'Example: RAILWAY_PUBLIC_URL=https://your-app.up.railway.app'
    );
  }

  // Fetch current price from production API
  console.log('Fetching price from:', apiUrl + '/price');
  let currentPrice: number;

  try {
    const response = await axios.get(`${apiUrl}/price`, { timeout: 10000 });

    if (!response.data.success || !response.data.price) {
      throw new Error('API returned invalid response: ' + JSON.stringify(response.data));
    }

    currentPrice = response.data.price;
    console.log('✓ Fetched current price from production API: $' + currentPrice + '\n');
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(
        `Cannot connect to ${apiUrl}\n` +
        'Make sure your Railway API is deployed and the URL is correct.'
      );
    }
    throw error;
  }

  // Convert price to 18 decimals for the contract
  const priceWei = ethers.parseUnits(currentPrice.toString(), 18);
  console.log('Price in wei (18 decimals):', priceWei.toString());

  // Validate price is within bounds
  const MIN_PRICE = BigInt(1e9);      // $0.000000001
  const MAX_PRICE = BigInt(1e18);     // $1.00

  if (priceWei < MIN_PRICE || priceWei > MAX_PRICE) {
    throw new Error(
      `Price $${currentPrice} is out of bounds!\n` +
      `Must be between $0.000000001 and $1.00`
    );
  }

  console.log('✓ Price is within safety bounds\n');

  // Deploy QuantaPriceOracleV2
  console.log('------------------------------------------------------------');
  console.log('Step 1: Deploying QuantaPriceOracleV2...');
  console.log('------------------------------------------------------------');

  const OracleFactory = await ethers.getContractFactory('QuantaPriceOracleV2');
  const oracle = await OracleFactory.deploy(priceWei);
  await oracle.waitForDeployment();

  const oracleAddress = await oracle.getAddress();
  console.log('✓ QuantaPriceOracleV2 deployed to:', oracleAddress);

  // Verify initial state
  const initialPrice = await oracle.price();
  const lastUpdate = await oracle.lastUpdate();
  const isUpdater = await oracle.isUpdater(deployer.address);

  console.log('\nInitial Oracle State:');
  console.log('  Price:', ethers.formatUnits(initialPrice, 18), 'USD');
  console.log('  Last Update:', new Date(Number(lastUpdate) * 1000).toISOString());
  console.log('  Deployer is Updater:', isUpdater);
  console.log('  Owner:', await oracle.owner());

  // Deploy QuantaRateProvider
  console.log('\n------------------------------------------------------------');
  console.log('Step 2: Deploying QuantaRateProvider...');
  console.log('------------------------------------------------------------');

  const RateProviderFactory = await ethers.getContractFactory('QuantaRateProvider');
  const rateProvider = await RateProviderFactory.deploy(oracleAddress);
  await rateProvider.waitForDeployment();

  const rateProviderAddress = await rateProvider.getAddress();
  console.log('✓ QuantaRateProvider deployed to:', rateProviderAddress);

  // Verify rate provider
  const rate = await rateProvider.getRate();
  console.log('\nRate Provider State:');
  console.log('  Oracle Address:', await rateProvider.oracle());
  console.log('  Current Rate:', ethers.formatUnits(rate, 18), 'USD');
  console.log('  QUANTA Token:', await rateProvider.QUANTA_TOKEN());

  // Summary
  console.log('\n============================================================');
  console.log('Deployment Summary');
  console.log('============================================================\n');

  console.log('✅ Deployment successful!\n');

  console.log('Contract Addresses:');
  console.log('  QuantaPriceOracleV2: ', oracleAddress);
  console.log('  QuantaRateProvider:  ', rateProviderAddress);

  console.log('\n============================================================');
  console.log('Next Steps');
  console.log('============================================================\n');

  console.log('1. Update your .env file with these addresses:');
  console.log(`   ORACLE_CONTRACT_V2=${oracleAddress}`);
  console.log(`   RATE_PROVIDER_CONTRACT=${rateProviderAddress}\n`);

  console.log('2. Verify contracts on BaseScan:');
  console.log(`   npx hardhat verify --network base ${oracleAddress} "${priceWei}"`);
  console.log(`   npx hardhat verify --network base ${rateProviderAddress} "${oracleAddress}"\n`);

  console.log('3. Set up automated price updates:');
  console.log('   npm run update:oracle\n');

  console.log('4. (Optional) Add your backend wallet as an updater:');
  console.log('   Use oracle.addUpdater(backendWalletAddress)\n');

  console.log('5. Submit to Balancer governance:');
  console.log('   Forum: https://forum.balancer.fi/c/rate-providers/');
  console.log(`   Rate Provider Address: ${rateProviderAddress}\n`);

  console.log('============================================================\n');

  // Save to a file for easy reference
  const fs = require('fs');
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: 'base',
    chainId: 8453,
    deployer: deployer.address,
    contracts: {
      QuantaPriceOracleV2: oracleAddress,
      QuantaRateProvider: rateProviderAddress,
    },
    initialPrice: currentPrice,
    priceWei: priceWei.toString(),
    apiUrl: apiUrl,
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('📝 Deployment info saved to deployment-info.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:\n');
    console.error(error);
    process.exit(1);
  });
