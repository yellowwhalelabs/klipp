// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EquityToken.sol";
import "../src/CapTable.sol";
import "../src/MockVesting.sol";

/// @notice Deploy Layer 3 contracts to Robinhood Chain Testnet.
///         Uses MockVesting as a placeholder until Stylus contract is deployed.
///
/// Usage:
///   forge script script/DeployRobinhood.s.sol \
///     --rpc-url $ROBINHOOD_TESTNET_RPC \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
contract DeployRobinhood is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("=== Deploying to Robinhood Chain Testnet ===");
        console.log("Deployer:", deployer);
        console.log("RPC:     ", vm.envString("ROBINHOOD_TESTNET_RPC"));

        vm.startBroadcast(deployerKey);

        // 1. Deploy factory
        EquityTokenFactory factory = new EquityTokenFactory();
        console.log("EquityTokenFactory:", address(factory));

        // 2. Deploy mock vesting (Solidity placeholder for Stylus contract)
        MockVesting mockVesting = new MockVesting();
        console.log("MockVesting:", address(mockVesting));

        // 3. Deploy demo equity token (10M shares, founder = deployer)
        EquityToken demoToken = new EquityToken(
            "KLIPP Demo Corp",
            "KLIPP",
            10_000_000 ether,
            deployer
        );
        console.log("DemoEquityToken:", address(demoToken));

        // 4. Deploy demo cap table
        CapTable demoCapTable = new CapTable(
            address(demoToken),
            address(mockVesting),
            deployer,
            "KLIPP Demo Corp"
        );
        console.log("DemoCapTable:", address(demoCapTable));

        // 5. Wire up: cap table can move tokens
        demoToken.setCapTable(address(demoCapTable));
        demoToken.approve(address(demoCapTable), type(uint256).max);

        vm.stopBroadcast();

        // Print addresses — copy to deployments/robinhood-testnet.json and .env.local
        console.log("\n=== Deployment complete! Copy these addresses ===");
        console.log("NEXT_PUBLIC_EQUITY_FACTORY_ADDRESS=", address(factory));
        console.log("NEXT_PUBLIC_DEMO_CAP_TABLE_ADDRESS=", address(demoCapTable));
        console.log("NEXT_PUBLIC_DEMO_EQUITY_TOKEN_ADDRESS=", address(demoToken));
        console.log("NEXT_PUBLIC_VESTING_ADDRESS=", address(mockVesting));
    }
}
