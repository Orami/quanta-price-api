// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuantaPriceOracle
 * @notice Price oracle for $QUANTA token on Base
 * @dev Reads price from Uniswap V2/V3 pools and provides accurate pricing
 */

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20 {
    function decimals() external view returns (uint8);
}

contract QuantaPriceOracle {
    address public constant QUANTA_TOKEN = 0x5ACDC563450cC35055d7344287C327fafB2b371A;

    // Add your liquidity pool addresses here
    // These should be the actual QUANTA pairs (e.g., QUANTA/VIRTUAL, QUANTA/WETH)
    address[] public v2Pools;
    address[] public v3Pools;

    address public owner;

    event PoolAdded(address indexed pool, bool isV3);
    event PoolRemoved(address indexed pool, bool isV3);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Add a Uniswap V2 pool for price calculation
     */
    function addV2Pool(address pool) external onlyOwner {
        v2Pools.push(pool);
        emit PoolAdded(pool, false);
    }

    /**
     * @notice Add a Uniswap V3 pool for price calculation
     */
    function addV3Pool(address pool) external onlyOwner {
        v3Pools.push(pool);
        emit PoolAdded(pool, true);
    }

    /**
     * @notice Get price from Uniswap V2 pool
     * @param pool The V2 pool address
     * @return price The price in 18 decimals
     */
    function getV2Price(address pool) public view returns (uint256 price) {
        IUniswapV2Pair pair = IUniswapV2Pair(pool);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        address token0 = pair.token0();
        address token1 = pair.token1();

        uint8 decimals0 = IERC20(token0).decimals();
        uint8 decimals1 = IERC20(token1).decimals();

        // Determine which reserve is QUANTA
        if (token0 == QUANTA_TOKEN) {
            // price = reserve1 / reserve0
            price = (uint256(reserve1) * (10 ** (18 + decimals0))) / (uint256(reserve0) * (10 ** decimals1));
        } else {
            // price = reserve0 / reserve1
            price = (uint256(reserve0) * (10 ** (18 + decimals1))) / (uint256(reserve1) * (10 ** decimals0));
        }

        return price;
    }

    /**
     * @notice Get price from Uniswap V3 pool
     * @param pool The V3 pool address
     * @return price The price in 18 decimals
     */
    function getV3Price(address pool) public view returns (uint256 price) {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(pool);
        (uint160 sqrtPriceX96,,,,,,) = v3Pool.slot0();

        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();

        uint8 decimals0 = IERC20(token0).decimals();
        uint8 decimals1 = IERC20(token1).decimals();

        // Calculate price from sqrtPriceX96
        uint256 priceX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);

        // Adjust for token decimals
        if (token0 == QUANTA_TOKEN) {
            // Price of token0 in terms of token1
            price = (priceX192 * (10 ** decimals0)) / (2 ** 192) / (10 ** decimals1);
        } else {
            // Price of token1 in terms of token0 (inverted)
            price = (2 ** 192) * (10 ** decimals1) / priceX192 / (10 ** decimals0);
        }

        return price;
    }

    /**
     * @notice Get liquidity-weighted average price across all pools
     * @return avgPrice The weighted average price in 18 decimals
     * @return totalLiquidity The total liquidity across all pools
     */
    function getAveragePrice() external view returns (uint256 avgPrice, uint256 totalLiquidity) {
        uint256 weightedSum = 0;
        totalLiquidity = 0;

        // Calculate V2 pools
        for (uint i = 0; i < v2Pools.length; i++) {
            IUniswapV2Pair pair = IUniswapV2Pair(v2Pools[i]);
            (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

            uint256 liquidity;
            if (pair.token0() == QUANTA_TOKEN) {
                liquidity = uint256(reserve0);
            } else {
                liquidity = uint256(reserve1);
            }

            uint256 price = getV2Price(v2Pools[i]);
            weightedSum += price * liquidity;
            totalLiquidity += liquidity;
        }

        // Calculate V3 pools (simplified - should use actual liquidity)
        for (uint i = 0; i < v3Pools.length; i++) {
            uint256 price = getV3Price(v3Pools[i]);
            // For V3, we're using a simple average since liquidity calculation is complex
            // In production, you'd want to calculate actual in-range liquidity
            weightedSum += price * 1e18; // Use 1e18 as default weight
            totalLiquidity += 1e18;
        }

        if (totalLiquidity > 0) {
            avgPrice = weightedSum / totalLiquidity;
        }

        return (avgPrice, totalLiquidity);
    }

    /**
     * @notice Get the best (highest liquidity) price
     * @return bestPrice The price from the pool with most liquidity
     */
    function getBestPrice() external view returns (uint256 bestPrice) {
        uint256 maxLiquidity = 0;

        for (uint i = 0; i < v2Pools.length; i++) {
            IUniswapV2Pair pair = IUniswapV2Pair(v2Pools[i]);
            (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

            uint256 liquidity;
            if (pair.token0() == QUANTA_TOKEN) {
                liquidity = uint256(reserve0);
            } else {
                liquidity = uint256(reserve1);
            }

            if (liquidity > maxLiquidity) {
                maxLiquidity = liquidity;
                bestPrice = getV2Price(v2Pools[i]);
            }
        }

        return bestPrice;
    }

    /**
     * @notice Get all pool addresses
     */
    function getAllPools() external view returns (address[] memory _v2Pools, address[] memory _v3Pools) {
        return (v2Pools, v3Pools);
    }
}
