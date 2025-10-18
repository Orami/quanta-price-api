import { ethers } from 'hardhat';

async function main() {
  const virtualsPoolAddress = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685';

  console.log('Testing Virtuals.io Pool Reserves\n');

  const provider = ethers.provider;

  // Try uint256 return type instead of uint112
  const virtualsInterface = [
    'function getReserves() external view returns (uint256, uint256)',
    'function baseToken() external view returns (address)',
    'function virtualToken() external view returns (address)',
  ];

  const pool = new ethers.Contract(virtualsPoolAddress, virtualsInterface, provider);

  try {
    const [reserve0, reserve1] = await pool.getReserves();
    console.log('✅ getReserves() succeeded!');
    console.log('Reserve 0:', ethers.formatEther(reserve0));
    console.log('Reserve 1:', ethers.formatEther(reserve1));
    console.log('Raw Reserve 0:', reserve0.toString());
    console.log('Raw Reserve 1:', reserve1.toString());
  } catch (error: any) {
    console.error('❌ getReserves failed:', error.message);
  }

  try {
    const baseToken = await pool.baseToken();
    console.log('\n✅ Base Token:', baseToken);
  } catch (error: any) {
    console.log('❌ baseToken:', error.message.split('\n')[0]);
  }

  try {
    const virtualToken = await pool.virtualToken();
    console.log('✅ Virtual Token:', virtualToken);
  } catch (error: any) {
    console.log('❌ virtualToken:', error.message.split('\n')[0]);
  }

  // Calculate price from reserves
  try {
    const [reserve0, reserve1] = await pool.getReserves();
    const price = (Number(reserve1) / Number(reserve0));
    console.log('\n📊 Calculated Price:', price.toExponential(6));
  } catch (error) {
    console.error('Could not calculate price');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
