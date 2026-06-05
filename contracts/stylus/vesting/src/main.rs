//! ABI-export binary.
//!
//! `cargo stylus deploy` invokes `cargo run --features export-abi` to print the
//! contract's Solidity ABI (it needs a runnable bin target to do so). This file
//! exists solely for that purpose.
//!
//! For the on-chain wasm build (without the export-abi feature) there is no
//! `main` — `no_main` keeps this an empty target so it never interferes with the
//! library cdylib that actually carries the contract's `user_entrypoint`.

// no_main only for the real on-chain build: NOT under `test` (else it suppresses
// the test-harness main and the bin's test target fails to link) and NOT under
// export-abi (which provides the real main below).
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(feature = "export-abi")]
fn main() {
    klipp_vesting::print_abi("MIT-OR-APACHE-2.0", "pragma solidity ^0.8.23;");
}
