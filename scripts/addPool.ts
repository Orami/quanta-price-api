import { ethers } from 'hardhat';

async function main() {
  const oracleAddress = '0x0B4610088A6D0ce2167027F345F5389bF87B89cE';
  const poolAddress = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685';

  console.log('Adding pool to oracle...');
  console.log('Oracle:', oracleAddress);
  console.log('Pool:', poolAddress);

  const oracle = await ethers.getContractAt('QuantaPriceOracle', oracleAddress);

  const tx = await oracle.addV2Pool(poolAddress);
  console.log('Transaction sent:', tx.hash);

  await tx.wait();
  console.log('Pool added successfully!');

  // Verify it was added
  const [v2Pools, v3Pools] = await oracle.getAllPools();
  console.log('\nCurrent pools:');
  console.log('V2 Pools:', v2Pools);
  console.log('V3 Pools:', v3Pools);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
