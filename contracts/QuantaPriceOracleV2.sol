// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuantaPriceOracleV2
 * @notice Price storage oracle for $QUANTA token on Base
 * @dev Stores price that gets updated by authorized backend service
 *
 * This oracle is designed to work with the QUANTA Price API:
 * - Backend fetches price from Virtuals Protocol + DexScreener
 * - Authorized updaters push price to this contract
 * - Balancer Rate Provider reads from this contract
 */
contract QuantaPriceOracleV2 {
    // Price stored in 18 decimals (e.g., 0.000005 = 5000000000000)
    uint256 public price;

    // Last time the price was updated
    uint256 public lastUpdate;

    // Maximum age of price before considered stale (1 hour)
    uint256 public constant MAX_PRICE_AGE = 1 hours;

    // Price bounds for safety
    uint256 public constant MIN_PRICE = 1e9;      // $0.000000001 (1 gwei)
    uint256 public constant MAX_PRICE = 1e18;     // $1.00

    // Access control
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public isUpdater;

    // Emergency controls
    bool public paused;

    // Events
    event PriceUpdated(uint256 newPrice, uint256 timestamp, address updater);
    event UpdaterAdded(address indexed updater);
    event UpdaterRemoved(address indexed updater);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyUpdater() {
        require(isUpdater[msg.sender], "Not authorized updater");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    /**
     * @notice Constructor sets initial price
     * @param _initialPrice Initial price in 18 decimals
     */
    constructor(uint256 _initialPrice) {
        require(_initialPrice >= MIN_PRICE && _initialPrice <= MAX_PRICE, "Initial price out of bounds");

        owner = msg.sender;
        isUpdater[msg.sender] = true; // Owner is an updater by default

        price = _initialPrice;
        lastUpdate = block.timestamp;
        paused = false;

        emit PriceUpdated(_initialPrice, block.timestamp, msg.sender);
        emit UpdaterAdded(msg.sender);
    }

    /**
     * @notice Update the price (only authorized updaters)
     * @param _newPrice New price in 18 decimals
     */
    function updatePrice(uint256 _newPrice) external onlyUpdater whenNotPaused {
        require(_newPrice >= MIN_PRICE && _newPrice <= MAX_PRICE, "Price out of bounds");

        price = _newPrice;
        lastUpdate = block.timestamp;

        emit PriceUpdated(_newPrice, block.timestamp, msg.sender);
    }

    /**
     * @notice Get the current price with staleness check
     * @return Current price in 18 decimals
     */
    function getPrice() external view whenNotPaused returns (uint256) {
        require(block.timestamp - lastUpdate <= MAX_PRICE_AGE, "Price data is stale");
        return price;
    }

    /**
     * @notice Get price without staleness check (for monitoring)
     * @return Current price and age
     */
    function getRawPrice() external view returns (uint256, uint256) {
        return (price, block.timestamp - lastUpdate);
    }

    /**
     * @notice Get last update timestamp
     */
    function getLastUpdate() external view returns (uint256) {
        return lastUpdate;
    }

    /**
     * @notice Check if price is stale
     */
    function isStale() external view returns (bool) {
        return block.timestamp - lastUpdate > MAX_PRICE_AGE;
    }

    /**
     * @notice Add authorized price updater
     * @param updater Address to authorize
     */
    function addUpdater(address updater) external onlyOwner {
        require(updater != address(0), "Invalid updater address");
        require(!isUpdater[updater], "Already an updater");

        isUpdater[updater] = true;
        emit UpdaterAdded(updater);
    }

    /**
     * @notice Remove authorized price updater
     * @param updater Address to remove
     */
    function removeUpdater(address updater) external onlyOwner {
        require(isUpdater[updater], "Not an updater");
        require(updater != owner, "Cannot remove owner as updater");

        isUpdater[updater] = false;
        emit UpdaterRemoved(updater);
    }

    /**
     * @notice Initiate ownership transfer (2-step process)
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

        // New owner is automatically an updater
        isUpdater[owner] = true;

        emit OwnershipTransferred(previousOwner, owner);
        emit UpdaterAdded(owner);
    }

    /**
     * @notice Pause the contract (emergency)
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
}
