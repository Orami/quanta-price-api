import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script to add liquidity pools to the deployed oracle
 * Usage: npx hardhat run scripts/addPools.ts --network base
 */

async function main() {
  const ORACLE_ADDRESS = process.env.ORACLE_CONTRACT;

  if (!ORACLE_ADDRESS) {
    console.error('Error: ORACLE_CONTRACT not set in .env');
    process.exit(1);
  }

  console.log('Adding pools to oracle at:', ORACLE_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log('Using account:', deployer.address);

  // Get the oracle contract
  const oracle = await ethers.getContractAt('QuantaPriceOracle', ORACLE_ADDRESS);

  // Add your pool addresses here
  const POOLS_TO_ADD = {
    v2: [
      // Add Uniswap V2 style pool addresses here
      // Example: '0x...',
      process.env.VIRTUAL_QUANTA_POOL,
    ].filter(Boolean),
    v3: [
      // Add Uniswap V3 style pool addresses here
      // Example: '0x...',
    ].filter(Boolean),
  };

  // Add V2 pools
  for (const pool of POOLS_TO_ADD.v2) {
    if (!pool) continue;
    console.log(`\nAdding V2 pool: ${pool}`);
    try {
      const tx = await oracle.addV2Pool(pool);
      await tx.wait();
      console.log('✓ Successfully added V2 pool');
    } catch (error: any) {
      console.error('✗ Error adding V2 pool:', error.message);
    }
  }

  // Add V3 pools
  for (const pool of POOLS_TO_ADD.v3) {
    if (!pool) continue;
    console.log(`\nAdding V3 pool: ${pool}`);
    try {
      const tx = await oracle.addV3Pool(pool);
      await tx.wait();
      console.log('✓ Successfully added V3 pool');
    } catch (error: any) {
      console.error('✗ Error adding V3 pool:', error.message);
    }
  }

  // Verify pools were added
  console.log('\nVerifying added pools...');
  const [v2Pools, v3Pools] = await oracle.getAllPools();
  console.log('V2 Pools:', v2Pools);
  console.log('V3 Pools:', v3Pools);

  // Test price fetch
  if (v2Pools.length > 0 || v3Pools.length > 0) {
    console.log('\nFetching price from oracle...');
    try {
      const [avgPrice, liquidity] = await oracle.getAveragePrice();
      console.log('Average Price:', ethers.formatUnits(avgPrice, 18));
      console.log('Total Liquidity:', ethers.formatUnits(liquidity, 18));
    } catch (error: any) {
      console.error('Error fetching price:', error.message);
    }
  }

  console.log('\n✓ Pool addition complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
