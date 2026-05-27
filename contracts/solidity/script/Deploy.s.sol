// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SoulboundCard.sol";
import "../src/ProCard.sol";
import "../src/EquityToken.sol";
import "../src/CapTable.sol";

/// @notice Deploy all KLIPP contracts.
///
/// Usage:
///   # Arbitrum Sepolia (Layers 1 + 2)
///   forge script script/Deploy.s.sol:DeployArbSepolia \
///     --rpc-url arbitrum_sepolia --broadcast --verify
///
///   # Robinhood Chain Testnet (Layer 3)
///   forge script script/Deploy.s.sol:DeployRobinhoodTestnet \
///     --rpc-url robinhood_testnet --broadcast

// ─────────────────────────────────────────────────────────────────────────────
// Arbitrum Sepolia — SoulboundCard + ProCard
// ─────────────────────────────────────────────────────────────────────────────

contract DeployArbSepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deploying to Arbitrum Sepolia...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        SoulboundCard soulboundCard = new SoulboundCard();
        console.log("SoulboundCard:", address(soulboundCard));

        ProCard proCard = new ProCard();
        console.log("ProCard:", address(proCard));

        vm.stopBroadcast();

        // Write deployment artifacts
        string memory json = string.concat(
            '{"chainId":421614,',
            '"soulboundCard":"', vm.toString(address(soulboundCard)), '",',
            '"proCard":"',       vm.toString(address(proCard)), '"}'
        );
        vm.writeFile("deployments/sepolia.json", json);
        console.log("Deployment artifacts written to deployments/sepolia.json");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Robinhood Chain Testnet — EquityTokenFactory + demo CapTable
// ─────────────────────────────────────────────────────────────────────────────

contract DeployRobinhoodTestnet is Script {
    /// @dev Address of the already-deployed Stylus vesting contract on Robinhood testnet.
    ///      Update this after `cargo stylus deploy` completes.
    address constant VESTING_CONTRACT = address(0); // TODO: fill after Stylus deploy

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deploying to Robinhood Chain Testnet...");
        console.log("Deployer:", deployer);
        require(VESTING_CONTRACT != address(0), "Set VESTING_CONTRACT first");

        vm.startBroadcast(deployerKey);

        // Factory — anyone can create equity tokens
        EquityTokenFactory factory = new EquityTokenFactory();
        console.log("EquityTokenFactory:", address(factory));

        // Demo equity token for the hackathon presentation
        EquityToken demoToken = new EquityToken(
            "KLIPP Demo Corp",
            "KLIPP",
            10_000_000 ether,
            deployer
        );
        console.log("Demo EquityToken:", address(demoToken));

        // Demo cap table
        CapTable demoCapTable = new CapTable(
            address(demoToken),
            VESTING_CONTRACT,
            deployer,
            "KLIPP Demo Corp"
        );
        console.log("Demo CapTable:", address(demoCapTable));

        // Wire them up
        demoToken.setCapTable(address(demoCapTable));
        demoToken.approve(address(demoCapTable), type(uint256).max);

        vm.stopBroadcast();

        // Write deployment artifacts
        string memory json = string.concat(
            '{"chainId":46630,',
            '"equityTokenFactory":"', vm.toString(address(factory)),      '",',
            '"demoEquityToken":"',    vm.toString(address(demoToken)),     '",',
            '"demoCapTable":"',       vm.toString(address(demoCapTable)),  '",',
            '"vestingContract":"',    vm.toString(VESTING_CONTRACT),       '"}'
        );
        vm.writeFile("deployments/robinhood-testnet.json", json);
        console.log("Deployment artifacts written to deployments/robinhood-testnet.json");
    }
}
