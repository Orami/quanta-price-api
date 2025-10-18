import { ethers } from 'hardhat';

async function main() {
  const oracleAddress = '0x0B4610088A6D0ce2167027F345F5389bF87B89cE';

  // Uniswap V3 pools
  const quantaUsdcPool = '0xa62ceb34708e2ecef26fb79feec271ae2e388a07'; // QUANTA/USDC 0.3%
  const quantaVirtualPool = '0x5a26834696cf820bcca40ec159e7278d9736858f'; // QUANTA/VIRTUAL 0.3%

  console.log('Adding Uniswap V3 pools to oracle...\n');
  console.log('Oracle:', oracleAddress);

  const oracle = await ethers.getContractAt('QuantaPriceOracle', oracleAddress);

  // Add QUANTA/USDC pool
  console.log('\n1. Adding QUANTA/USDC pool:', quantaUsdcPool);
  const tx1 = await oracle.addV3Pool(quantaUsdcPool);
  console.log('Transaction sent:', tx1.hash);
  await tx1.wait();
  console.log('✅ QUANTA/USDC pool added!');

  // Add QUANTA/VIRTUAL pool
  console.log('\n2. Adding QUANTA/VIRTUAL pool:', quantaVirtualPool);
  const tx2 = await oracle.addV3Pool(quantaVirtualPool);
  console.log('Transaction sent:', tx2.hash);
  await tx2.wait();
  console.log('✅ QUANTA/VIRTUAL pool added!');

  // Verify pools were added
  const [v2Pools, v3Pools] = await oracle.getAllPools();
  console.log('\n==============================================');
  console.log('Current Oracle Configuration:');
  console.log('==============================================');
  console.log('V2 Pools:', v2Pools);
  console.log('V3 Pools:', v3Pools);
  console.log('==============================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
