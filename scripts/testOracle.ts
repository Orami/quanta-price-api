import { ethers } from 'hardhat';

async function main() {
  const oracleAddress = '0x0B4610088A6D0ce2167027F345F5389bF87B89cE';
  const poolAddress = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685';

  console.log('Testing QUANTA Price Oracle...\n');

  const oracle = await ethers.getContractAt('QuantaPriceOracle', oracleAddress);

  // Check pools
  const [v2Pools, v3Pools] = await oracle.getAllPools();
  console.log('Registered V2 Pools:', v2Pools);
  console.log('Registered V3 Pools:', v3Pools);
  console.log('');

  // Try to get price from specific pool
  try {
    console.log('Getting V2 price from pool:', poolAddress);
    const price = await oracle.getV2Price(poolAddress);
    console.log('Price:', ethers.formatEther(price), 'per QUANTA');
  } catch (error: any) {
    console.error('Error getting V2 price:', error.message);
  }

  // Try to get average price
  try {
    console.log('\nGetting average price...');
    const [avgPrice, totalLiquidity] = await oracle.getAveragePrice();
    console.log('Average Price:', ethers.formatEther(avgPrice));
    console.log('Total Liquidity:', totalLiquidity.toString());
  } catch (error: any) {
    console.error('Error getting average price:', error.message);
  }

  // Try to get best price
  try {
    console.log('\nGetting best price...');
    const bestPrice = await oracle.getBestPrice();
    console.log('Best Price:', ethers.formatEther(bestPrice));
  } catch (error: any) {
    console.error('Error getting best price:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
