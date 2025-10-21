import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ORACLE_ABI = [
  'function updatePrice(uint256 _newPrice) external',
  'function getPrice() external view returns (uint256)',
  'function getRawPrice() external view returns (uint256, uint256)',
  'function getLastUpdate() external view returns (uint256)',
  'function isUpdater(address) external view returns (bool)',
  'function isStale() external view returns (bool)',
  'function paused() external view returns (bool)',
];

async function main() {
  console.log('============================================================');
  console.log('QUANTA Oracle Price Update');
  console.log('============================================================\n');

  // Get updater wallet
  const [updater] = await ethers.getSigners();
  console.log('Updater address:', updater.address);

  const balance = await ethers.provider.getBalance(updater.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Get oracle contract address
  const oracleAddress = process.env.ORACLE_CONTRACT_V2;
  if (!oracleAddress) {
    throw new Error(
      'ORACLE_CONTRACT_V2 not set in .env file.\n' +
      'Deploy the oracle first using: npm run deploy:rate-provider'
    );
  }

  console.log('Oracle address:', oracleAddress);

  // Connect to oracle
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, updater);

  // Check if updater is authorized
  const isAuthorized = await oracle.isUpdater(updater.address);
  if (!isAuthorized) {
    throw new Error(
      `Address ${updater.address} is not an authorized updater.\n` +
      'The contract owner must call: oracle.addUpdater("' + updater.address + '")'
    );
  }
  console.log('✓ Updater is authorized\n');

  // Check if contract is paused
  const isPaused = await oracle.paused();
  if (isPaused) {
    throw new Error('Oracle contract is paused. Cannot update price.');
  }

  // Get Railway API URL
  const apiUrl = process.env.RAILWAY_PUBLIC_URL || process.env.PRICE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'Please set RAILWAY_PUBLIC_URL or PRICE_API_URL in your .env file'
    );
  }

  // Fetch current price from API
  console.log('Fetching price from:', apiUrl + '/price');
  let currentPrice: number;

  try {
    const response = await axios.get(`${apiUrl}/price`, { timeout: 10000 });

    if (!response.data.success || !response.data.price) {
      throw new Error('API returned invalid response');
    }

    currentPrice = response.data.price;
    console.log('Current API price: $' + currentPrice);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(`Cannot connect to ${apiUrl}`);
    }
    throw error;
  }

  // Get current on-chain state
  const [onChainPrice, priceAge] = await oracle.getRawPrice();
  const lastUpdate = await oracle.getLastUpdate();
  const isStale = await oracle.isStale();

  console.log('\nCurrent on-chain state:');
  console.log('  Price:', ethers.formatUnits(onChainPrice, 18), 'USD');
  console.log('  Last update:', new Date(Number(lastUpdate) * 1000).toISOString());
  console.log('  Age:', priceAge.toString(), 'seconds');
  console.log('  Is stale:', isStale);

  // Convert new price to wei
  const newPriceWei = ethers.parseUnits(currentPrice.toString(), 18);

  // Check if update is needed (price changed by more than 0.1%)
  const priceDiffPercent = Math.abs(
    Number(newPriceWei - onChainPrice) / Number(onChainPrice) * 100
  );

  console.log('\nPrice difference:', priceDiffPercent.toFixed(4) + '%');

  // Update if price changed significantly OR if stale
  const PRICE_CHANGE_THRESHOLD = 0.1; // 0.1%
  const shouldUpdate = priceDiffPercent >= PRICE_CHANGE_THRESHOLD || isStale;

  if (!shouldUpdate) {
    console.log('\n✓ Price is up to date, no update needed');
    return;
  }

  // Update the price
  console.log('\n------------------------------------------------------------');
  console.log('Updating Oracle Price...');
  console.log('------------------------------------------------------------');
  console.log('New price:', currentPrice, 'USD');
  console.log('New price (wei):', newPriceWei.toString());

  try {
    const tx = await oracle.updatePrice(newPriceWei);
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✓ Transaction confirmed in block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    // Get updated state
    const [updatedPrice, updatedAge] = await oracle.getRawPrice();
    const updatedTimestamp = await oracle.getLastUpdate();

    console.log('\n✅ Price updated successfully!');
    console.log('New on-chain state:');
    console.log('  Price:', ethers.formatUnits(updatedPrice, 18), 'USD');
    console.log('  Last update:', new Date(Number(updatedTimestamp) * 1000).toISOString());
    console.log('  Age:', updatedAge.toString(), 'seconds');

  } catch (error: any) {
    if (error.message.includes('Price out of bounds')) {
      throw new Error(
        `Price $${currentPrice} is outside allowed bounds.\n` +
        'Check MIN_PRICE and MAX_PRICE in the oracle contract.'
      );
    }
    throw error;
  }

  console.log('\n============================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Update failed:\n');
    console.error(error.message || error);
    process.exit(1);
  });
