import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying QUANTA Price Oracle to Base...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Deploy the oracle
  const QuantaPriceOracle = await ethers.getContractFactory('QuantaPriceOracle');
  const oracle = await QuantaPriceOracle.deploy();
  await oracle.waitForDeployment();

  const oracleAddress = await oracle.getAddress();
  console.log('QuantaPriceOracle deployed to:', oracleAddress);

  // Add pools if you know them
  // Uncomment and add your pool addresses
  /*
  console.log('\nAdding liquidity pools...');

  const VIRTUAL_QUANTA_POOL = '0x...'; // Your QUANTA/VIRTUAL pool address

  const tx1 = await oracle.addV2Pool(VIRTUAL_QUANTA_POOL);
  await tx1.wait();
  console.log('Added V2 pool:', VIRTUAL_QUANTA_POOL);
  */

  console.log('\n==============================================');
  console.log('Deployment Complete!');
  console.log('==============================================');
  console.log('\nNext steps:');
  console.log('1. Update .env with ORACLE_CONTRACT=' + oracleAddress);
  console.log('2. Find your liquidity pool addresses on Virtuals.io');
  console.log('3. Add pools using: oracle.addV2Pool(poolAddress)');
  console.log('4. Verify contract on BaseScan:');
  console.log(`   npx hardhat verify --network base ${oracleAddress}`);
  console.log('\n==============================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
