import { ethers } from 'hardhat';

async function main() {
  const oracleAddress = '0xA706A744690bb6c2E3C3323E5e6682765285284C';

  // Pool addresses
  const virtualsPool = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685'; // QUANTA/VIRTUAL (Virtuals.io)
  const quantaUsdcPool = '0xa62ceb34708e2ecef26fb79feec271ae2e388a07'; // QUANTA/USDC (Uniswap V3)
  const quantaVirtualPool = '0x5a26834696cf820bcca40ec159e7278d9736858f'; // QUANTA/VIRTUAL (Uniswap V3)

  console.log('Setting up all pools for oracle:', oracleAddress);
  console.log('==============================================\n');

  const oracle = await ethers.getContractAt('QuantaPriceOracle', oracleAddress);

  // Add Virtuals.io pool
  console.log('1. Adding Virtuals.io pool:', virtualsPool);
  const tx1 = await oracle.addVirtualsPool(virtualsPool);
  console.log('Transaction sent:', tx1.hash);
  await tx1.wait();
  console.log('✅ Virtuals pool added!\n');

  // Add Uniswap V3 QUANTA/USDC pool
  console.log('2. Adding Uniswap V3 QUANTA/USDC pool:', quantaUsdcPool);
  const tx2 = await oracle.addV3Pool(quantaUsdcPool);
  console.log('Transaction sent:', tx2.hash);
  await tx2.wait();
  console.log('✅ QUANTA/USDC pool added!\n');

  // Add Uniswap V3 QUANTA/VIRTUAL pool
  console.log('3. Adding Uniswap V3 QUANTA/VIRTUAL pool:', quantaVirtualPool);
  const tx3 = await oracle.addV3Pool(quantaVirtualPool);
  console.log('Transaction sent:', tx3.hash);
  await tx3.wait();
  console.log('✅ QUANTA/VIRTUAL pool added!\n');

  // Verify pools were added
  const [v2Pools, v3Pools, virtualsPools] = await oracle.getAllPools();
  console.log('==============================================');
  console.log('Oracle Configuration Complete!');
  console.log('==============================================');
  console.log('V2 Pools:', v2Pools);
  console.log('V3 Pools:', v3Pools);
  console.log('Virtuals Pools:', virtualsPools);
  console.log('==============================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
