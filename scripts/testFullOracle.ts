import { ethers } from 'hardhat';

async function main() {
  const oracleAddress = '0xA706A744690bb6c2E3C3323E5e6682765285284C';
  const virtualsPool = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685';

  console.log('Testing QUANTA Price Oracle (Updated)');
  console.log('==============================================\n');

  const oracle = await ethers.getContractAt('QuantaPriceOracle', oracleAddress);

  // Check pools
  const [v2Pools, v3Pools, virtualsPools] = await oracle.getAllPools();
  console.log('Registered Pools:');
  console.log('- V2 Pools:', v2Pools.length, v2Pools);
  console.log('- V3 Pools:', v3Pools.length, v3Pools);
  console.log('- Virtuals Pools:', virtualsPools.length, virtualsPools);
  console.log('');

  // Test Virtuals pool price
  try {
    console.log('Testing Virtuals pool:', virtualsPool);
    const price = await oracle.getVirtualsPrice(virtualsPool);
    console.log('✅ Virtuals Price:', ethers.formatEther(price), 'per QUANTA');
    console.log('   Price in USD (if paired with $1 stablecoin):', ethers.formatEther(price));
  } catch (error: any) {
    console.error('❌ Error getting Virtuals price:', error.message);
  }

  // Test V3 pools
  for (const v3Pool of v3Pools) {
    try {
      console.log('\nTesting V3 pool:', v3Pool);
      const price = await oracle.getV3Price(v3Pool);
      console.log('✅ V3 Price:', ethers.formatEther(price), 'per QUANTA');
    } catch (error: any) {
      console.error('❌ Error getting V3 price:', error.message);
    }
  }

  // Test average price
  try {
    console.log('\n📊 Getting weighted average price...');
    const [avgPrice, totalLiquidity] = await oracle.getAveragePrice();
    console.log('✅ Average Price:', ethers.formatEther(avgPrice), 'per QUANTA');
    console.log('   Total Liquidity:', ethers.formatEther(totalLiquidity), 'QUANTA');
    console.log('   Price in scientific notation:', Number(ethers.formatEther(avgPrice)).toExponential(6));
  } catch (error: any) {
    console.error('❌ Error getting average price:', error.message);
  }

  // Test best price
  try {
    console.log('\n🏆 Getting best (highest liquidity) price...');
    const bestPrice = await oracle.getBestPrice();
    console.log('✅ Best Price:', ethers.formatEther(bestPrice), 'per QUANTA');
    console.log('   Price in scientific notation:', Number(ethers.formatEther(bestPrice)).toExponential(6));
  } catch (error: any) {
    console.error('❌ Error getting best price:', error.message);
  }

  console.log('\n==============================================');
  console.log('Oracle Testing Complete!');
  console.log('==============================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
