import { ethers } from 'hardhat';

async function main() {
  const virtualsPoolAddress = '0xd17616d20d81d6e2eaa8f6eca5583a28793da685';

  console.log('Inspecting Virtuals.io Pool:', virtualsPoolAddress);
  console.log('==============================================\n');

  const provider = ethers.provider;

  // Get bytecode to check if it's a contract
  const code = await provider.getCode(virtualsPoolAddress);
  console.log('Contract exists:', code !== '0x');

  // Try different interfaces
  const interfaces = [
    'function getReserves() external view returns (uint112, uint112, uint32)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function reserve0() external view returns (uint256)',
    'function reserve1() external view returns (uint256)',
    'function getAmountOut(uint256) external view returns (uint256)',
    'function price0CumulativeLast() external view returns (uint256)',
    'function price1CumulativeLast() external view returns (uint256)',
  ];

  for (const iface of interfaces) {
    try {
      const contract = new ethers.Contract(
        virtualsPoolAddress,
        [iface],
        provider
      );
      const funcName = iface.split(' ')[1].split('(')[0];
      console.log(`Testing ${funcName}...`);

      if (funcName === 'getReserves') {
        const result = await contract.getReserves();
        console.log(`✅ ${funcName}:`, result);
      } else if (funcName === 'getAmountOut') {
        const result = await contract.getAmountOut(ethers.parseEther('1'));
        console.log(`✅ ${funcName}(1 ETH):`, result);
      } else {
        const result = await contract[funcName]();
        console.log(`✅ ${funcName}:`, result);
      }
    } catch (error: any) {
      console.log(`❌ ${iface.split(' ')[1].split('(')[0]}: ${error.message.split('\n')[0]}`);
    }
  }

  console.log('\n==============================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
