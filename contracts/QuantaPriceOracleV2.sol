// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuantaPriceOracleV2
 * @notice Enhanced price oracle for $QUANTA token on Base with security improvements
 * @dev Reads price from Uniswap V2/V3 and Virtuals.io pools with safety features
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

interface IVirtualsPool {
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1);
}

contract QuantaPriceOracleV2 {
    address public constant QUANTA_TOKEN = 0x5ACDC563450cC35055d7344287C327fafB2b371A;

    address[] public v2Pools;
    address[] public v3Pools;
    address[] public virtualsPools;

    address public owner;
    address public pendingOwner;
    bool public paused;

    event PoolAdded(address indexed pool, string poolType);
    event PoolRemoved(address indexed pool, string poolType);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    /**
     * @notice Initiate ownership transfer (2-step process for safety)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        require(newOwner != owner, "New owner is current owner");
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    /**
     * @notice Accept ownership transfer
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /**
     * @notice Pause the contract (emergency use)
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Add a Uniswap V2 pool for price calculation
     */
    function addV2Pool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid pool address");
        v2Pools.push(pool);
        emit PoolAdded(pool, "v2");
    }

    /**
     * @notice Remove a Uniswap V2 pool
     * @param index Index of the pool in the array
     */
    function removeV2Pool(uint256 index) external onlyOwner {
        require(index < v2Pools.length, "Index out of bounds");
        address removed = v2Pools[index];
        v2Pools[index] = v2Pools[v2Pools.length - 1];
        v2Pools.pop();
        emit PoolRemoved(removed, "v2");
    }

    /**
     * @notice Add a Uniswap V3 pool for price calculation
     */
    function addV3Pool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid pool address");
        v3Pools.push(pool);
        emit PoolAdded(pool, "v3");
    }

    /**
     * @notice Remove a Uniswap V3 pool
     * @param index Index of the pool in the array
     */
    function removeV3Pool(uint256 index) external onlyOwner {
        require(index < v3Pools.length, "Index out of bounds");
        address removed = v3Pools[index];
        v3Pools[index] = v3Pools[v3Pools.length - 1];
        v3Pools.pop();
        emit PoolRemoved(removed, "v3");
    }

    /**
     * @notice Add a Virtuals.io pool for price calculation
     */
    function addVirtualsPool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid pool address");
        virtualsPools.push(pool);
        emit PoolAdded(pool, "virtuals");
    }

    /**
     * @notice Remove a Virtuals.io pool
     * @param index Index of the pool in the array
     */
    function removeVirtualsPool(uint256 index) external onlyOwner {
        require(index < virtualsPools.length, "Index out of bounds");
        address removed = virtualsPools[index];
        virtualsPools[index] = virtualsPools[virtualsPools.length - 1];
        virtualsPools.pop();
        emit PoolRemoved(removed, "virtuals");
    }

    /**
     * @notice Get price from Uniswap V2 pool
     * @param pool The V2 pool address
     * @return price The price in 18 decimals
     */
    function getV2Price(address pool) public view whenNotPaused returns (uint256 price) {
        IUniswapV2Pair pair = IUniswapV2Pair(pool);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        require(reserve0 > 0 && reserve1 > 0, "Invalid reserves");

        address token0 = pair.token0();
        address token1 = pair.token1();

        uint8 decimals0 = IERC20(token0).decimals();
        uint8 decimals1 = IERC20(token1).decimals();

        // Determine which reserve is QUANTA
        if (token0 == QUANTA_TOKEN) {
            price = (uint256(reserve1) * (10 ** (18 + decimals0))) / (uint256(reserve0) * (10 ** decimals1));
        } else {
            price = (uint256(reserve0) * (10 ** (18 + decimals1))) / (uint256(reserve1) * (10 ** decimals0));
        }

        return price;
    }

    /**
     * @notice Get price from Uniswap V3 pool
     * @param pool The V3 pool address
     * @return price The price in 18 decimals
     */
    function getV3Price(address pool) public view whenNotPaused returns (uint256 price) {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(pool);
        (uint160 sqrtPriceX96,,,,,,) = v3Pool.slot0();

        require(sqrtPriceX96 > 0, "Invalid price");

        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();

        uint8 decimals0 = IERC20(token0).decimals();
        uint8 decimals1 = IERC20(token1).decimals();

        uint256 priceX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);

        if (token0 == QUANTA_TOKEN) {
            price = (priceX192 * (10 ** decimals0)) / (2 ** 192) / (10 ** decimals1);
        } else {
            price = (2 ** 192) * (10 ** decimals1) / priceX192 / (10 ** decimals0);
        }

        return price;
    }

    /**
     * @notice Get price from Virtuals.io pool
     * @param pool The Virtuals pool address
     * @return price The price in 18 decimals
     */
    function getVirtualsPrice(address pool) public view whenNotPaused returns (uint256 price) {
        IVirtualsPool virtualsPool = IVirtualsPool(pool);
        (uint256 reserve0, uint256 reserve1) = virtualsPool.getReserves();

        require(reserve0 > 0 && reserve1 > 0, "Invalid reserves");

        price = (reserve1 * 1e18) / reserve0;
        return price;
    }

    /**
     * @notice Get liquidity-weighted average price across all pools
     * @return avgPrice The weighted average price in 18 decimals
     * @return totalLiquidity The total liquidity across all pools
     */
    function getAveragePrice() external view whenNotPaused returns (uint256 avgPrice, uint256 totalLiquidity) {
        uint256 weightedSum = 0;
        totalLiquidity = 0;

        // Calculate V2 pools
        for (uint i = 0; i < v2Pools.length; i++) {
            try this.getV2Price(v2Pools[i]) returns (uint256 price) {
                IUniswapV2Pair pair = IUniswapV2Pair(v2Pools[i]);
                (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

                uint256 liquidity;
                if (pair.token0() == QUANTA_TOKEN) {
                    liquidity = uint256(reserve0);
                } else {
                    liquidity = uint256(reserve1);
                }

                weightedSum += price * liquidity;
                totalLiquidity += liquidity;
            } catch {
                // Skip pools that fail (e.g., drained pools)
                continue;
            }
        }

        // Calculate V3 pools
        for (uint i = 0; i < v3Pools.length; i++) {
            try this.getV3Price(v3Pools[i]) returns (uint256 price) {
                weightedSum += price * 1e18;
                totalLiquidity += 1e18;
            } catch {
                continue;
            }
        }

        // Calculate Virtuals pools
        for (uint i = 0; i < virtualsPools.length; i++) {
            try this.getVirtualsPrice(virtualsPools[i]) returns (uint256 price) {
                IVirtualsPool virtualsPool = IVirtualsPool(virtualsPools[i]);
                (uint256 reserve0, ) = virtualsPool.getReserves();

                weightedSum += price * reserve0;
                totalLiquidity += reserve0;
            } catch {
                continue;
            }
        }

        require(totalLiquidity > 0, "No valid pools");
        avgPrice = weightedSum / totalLiquidity;

        return (avgPrice, totalLiquidity);
    }

    /**
     * @notice Get the best (highest liquidity) price
     * @return bestPrice The price from the pool with most liquidity
     */
    function getBestPrice() external view whenNotPaused returns (uint256 bestPrice) {
        uint256 maxLiquidity = 0;

        for (uint i = 0; i < v2Pools.length; i++) {
            try this.getV2Price(v2Pools[i]) returns (uint256 price) {
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
                    bestPrice = price;
                }
            } catch {
                continue;
            }
        }

        for (uint i = 0; i < virtualsPools.length; i++) {
            try this.getVirtualsPrice(virtualsPools[i]) returns (uint256 price) {
                IVirtualsPool virtualsPool = IVirtualsPool(virtualsPools[i]);
                (uint256 reserve0, ) = virtualsPool.getReserves();

                if (reserve0 > maxLiquidity) {
                    maxLiquidity = reserve0;
                    bestPrice = price;
                }
            } catch {
                continue;
            }
        }

        require(maxLiquidity > 0, "No valid pools");
        return bestPrice;
    }

    /**
     * @notice Get all pool addresses
     */
    function getAllPools() external view returns (
        address[] memory _v2Pools,
        address[] memory _v3Pools,
        address[] memory _virtualsPools
    ) {
        return (v2Pools, v3Pools, virtualsPools);
    }
}
