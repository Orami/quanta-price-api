// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuantaRateProvider
 * @notice Balancer V3 Rate Provider for $QUANTA token on Base
 * @dev Implements IRateProvider interface required by Balancer
 *
 * This contract provides the canonical price for QUANTA in Balancer pools
 * by reading from the QuantaPriceOracleV2 contract, which is updated by
 * the backend API service.
 *
 * Balancer uses this to:
 * - Calculate accurate TVL for pools containing QUANTA
 * - Price swaps correctly
 * - Enable boosted pool strategies
 */

interface IRateProvider {
    /**
     * @notice Returns the rate (price) of the token
     * @return The rate in 18 decimals
     */
    function getRate() external view returns (uint256);
}

interface IQuantaPriceOracle {
    function getPrice() external view returns (uint256);
    function getRawPrice() external view returns (uint256, uint256);
    function isStale() external view returns (bool);
}

contract QuantaRateProvider is IRateProvider {
    /// @notice The oracle contract that provides the QUANTA price
    IQuantaPriceOracle public immutable oracle;

    /// @notice QUANTA token address on Base
    address public constant QUANTA_TOKEN = 0x5ACDC563450cC35055d7344287C327fafB2b371A;

    /// @notice Event emitted when rate is queried (for monitoring)
    event RateQueried(uint256 rate, uint256 timestamp);

    /**
     * @notice Constructor
     * @param _oracle Address of the QuantaPriceOracleV2 contract
     */
    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle address cannot be zero");
        oracle = IQuantaPriceOracle(_oracle);
    }

    /**
     * @notice Get the current rate (implements IRateProvider)
     * @dev This is called by Balancer to get the QUANTA price
     * @return The rate in 18 decimals (USD price of QUANTA)
     */
    function getRate() external view override returns (uint256) {
        // This will revert if price is stale (>1 hour old) or contract is paused
        return oracle.getPrice();
    }

    /**
     * @notice Get the rate without staleness check (for monitoring)
     * @return rate The current rate
     * @return age The age of the price in seconds
     */
    function getRateWithAge() external view returns (uint256 rate, uint256 age) {
        return oracle.getRawPrice();
    }

    /**
     * @notice Check if the oracle price is stale
     * @return True if price is older than MAX_PRICE_AGE
     */
    function isRateStale() external view returns (bool) {
        return oracle.isStale();
    }

    /**
     * @notice Get the oracle address
     * @return The address of the price oracle
     */
    function getOracle() external view returns (address) {
        return address(oracle);
    }
}
