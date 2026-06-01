//! KLIPP Vesting — Arbitrum Stylus (WASM) contract
//!
//! Implements cliff + linear vesting for the KLIPP equity layer.
//! ABI-compatible with the Solidity IVesting interface:
//!
//!   function createGrant(uint256 grantId, address beneficiary,
//!                        uint256 totalAmount, uint64 startTime,
//!                        uint64 cliffSeconds, uint64 durationSeconds) external;
//!   function vestedAmount(uint256 grantId, uint64 currentTime) external view returns (uint256);
//!
//! Build modes
//! -----------
//! • `cargo test --no-default-features` — pure-Rust math tests, runs on any host (incl. Windows)
//! • `cargo stylus check --features contract` — WASM compile + ABI validation
//! • `cargo stylus deploy --features contract --endpoint $RPC --private-key $KEY` — deploy
//!
//! cargo-stylus 0.10.x + stylus-sdk 0.8.x + Rust 1.96 in Docker (see Dockerfile)

// On-chain WASM builds must be no_std + no_main (no OS, custom entrypoint).
// Tests (`cargo test --no-default-features`) and `export-abi` builds keep std +
// the normal main, so both attributes are gated off in those two cases.
// Mirrors OffchainLabs/stylus-hello-world.
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

// ---------------------------------------------------------------------------
// Pure vesting math — no external dependencies
// ---------------------------------------------------------------------------

/// Compute how much has vested by `current_time`.
///
/// Arguments
/// ---------
/// * `total`      — total grant amount (raw token units)
/// * `start`      — unix timestamp when vesting begins
/// * `cliff_secs` — seconds after `start` before any tokens vest
/// * `dur_secs`   — total vesting period in seconds
/// * `now`        — query timestamp
///
/// Returns
/// -------
/// Tokens vested (≤ `total`), rounded down.
pub fn compute_vested(
    total: u128,
    start: u64,
    cliff_secs: u64,
    dur_secs: u64,
    now: u64,
) -> u128 {
    if dur_secs == 0 || total == 0 {
        return 0;
    }
    if now < start {
        return 0;
    }
    let elapsed = now - start;
    if elapsed < cliff_secs {
        return 0;
    }
    if elapsed >= dur_secs {
        return total;
    }
    // Linear: total * elapsed / duration  (integer, rounds down)
    total
        .saturating_mul(elapsed as u128)
        .saturating_div(dur_secs as u128)
}

// ---------------------------------------------------------------------------
// Stylus contract — only compiled for WASM / "contract" feature
// ---------------------------------------------------------------------------

#[cfg(feature = "contract")]
mod contract {
    use super::compute_vested;
    use alloc::vec::Vec;
    use stylus_sdk::{
        alloy_primitives::{Address, U256},
        msg,
        prelude::*,
    };

    // Time/amount fields stored as uint256 to avoid U64 conversion ambiguity.
    // Storage slots are 32 bytes regardless — no gas penalty.
    sol_storage! {
        #[entrypoint]
        pub struct KLIPPVesting {
            /// Deployer — only owner may call createGrant
            address owner;

            /// Per-grant storage (flat maps keyed by grantId)
            mapping(uint256 => address)  beneficiary;
            mapping(uint256 => uint256)  total_amount;
            mapping(uint256 => uint256)  start_time;       // seconds (epoch)
            mapping(uint256 => uint256)  cliff_seconds;
            mapping(uint256 => uint256)  duration_seconds;
            mapping(uint256 => uint256)  claimed;
            mapping(uint256 => bool)     exists;
        }
    }

    #[public]
    impl KLIPPVesting {
        /// Initialise — sets owner.  Call once after deployment.
        pub fn initialize(&mut self) -> Result<(), Vec<u8>> {
            self.owner.set(msg::sender());
            Ok(())
        }

        // ── IVesting: createGrant ────────────────────────────────────────────
        #[allow(non_snake_case)]
        pub fn createGrant(
            &mut self,
            grant_id: U256,
            beneficiary: Address,
            total_amount: U256,
            start_time: u64,
            cliff_seconds: u64,
            duration_seconds: u64,
        ) -> Result<(), Vec<u8>> {
            // Access control
            if msg::sender() != self.owner.get() {
                return Err(b"KLIPPVesting: not owner".to_vec());
            }
            // No duplicate grants
            if self.exists.get(grant_id) {
                return Err(b"KLIPPVesting: grant exists".to_vec());
            }
            // Sanity: duration must be non-zero
            if duration_seconds == 0 {
                return Err(b"KLIPPVesting: zero duration".to_vec());
            }

            self.beneficiary.setter(grant_id).set(beneficiary);
            self.total_amount.setter(grant_id).set(total_amount);
            self.start_time.setter(grant_id).set(U256::from(start_time));
            self.cliff_seconds
                .setter(grant_id)
                .set(U256::from(cliff_seconds));
            self.duration_seconds
                .setter(grant_id)
                .set(U256::from(duration_seconds));
            self.claimed.setter(grant_id).set(U256::ZERO);
            self.exists.setter(grant_id).set(true);

            Ok(())
        }

        // ── IVesting: vestedAmount ───────────────────────────────────────────
        #[allow(non_snake_case)]
        pub fn vestedAmount(
            &self,
            grant_id: U256,
            current_time: u64,
        ) -> Result<U256, Vec<u8>> {
            if !self.exists.get(grant_id) {
                return Err(b"KLIPPVesting: unknown grant".to_vec());
            }
            let total = self.total_amount.get(grant_id);
            // saturating_to: safe downcast U256 → u64/u128
            let start = self.start_time.get(grant_id).saturating_to::<u64>();
            let cliff = self.cliff_seconds.get(grant_id).saturating_to::<u64>();
            let dur   = self.duration_seconds.get(grant_id).saturating_to::<u64>();

            let total_u128  = total.saturating_to::<u128>();
            let vested_u128 = compute_vested(total_u128, start, cliff, dur, current_time);

            Ok(U256::from(vested_u128))
        }

        // ── Convenience: unclaimed tokens (for dashboard polling) ─────────────
        pub fn unclaimed(
            &self,
            grant_id: U256,
            current_time: u64,
        ) -> Result<U256, Vec<u8>> {
            let vested  = self.vestedAmount(grant_id, current_time)?;
            let already = self.claimed.get(grant_id);
            Ok(vested.saturating_sub(already))
        }

        // ── Getter: full grant struct ─────────────────────────────────────────
        pub fn get_grant(
            &self,
            grant_id: U256,
        ) -> Result<(Address, U256, U256, U256, U256, U256), Vec<u8>> {
            if !self.exists.get(grant_id) {
                return Err(b"KLIPPVesting: unknown grant".to_vec());
            }
            Ok((
                self.beneficiary.get(grant_id),
                self.total_amount.get(grant_id),
                self.start_time.get(grant_id),
                self.cliff_seconds.get(grant_id),
                self.duration_seconds.get(grant_id),
                self.claimed.get(grant_id),
            ))
        }
    }
}

// ---------------------------------------------------------------------------
// Unit tests — pure math only (no Stylus VM needed, runs on any host)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::compute_vested;

    const TOTAL: u128 = 1_000_000; // 1 M tokens (raw units)
    const START: u64  = 1_000_000; // arbitrary epoch second
    const CLIFF: u64  = 365 * 24 * 3_600;     // 1 year
    const DUR:   u64  = 4 * 365 * 24 * 3_600; // 4 years

    // ── Before schedule starts ───────────────────────────────────────────────
    #[test]
    fn before_start_returns_zero() {
        assert_eq!(compute_vested(TOTAL, START, CLIFF, DUR, START - 1), 0);
    }

    #[test]
    fn at_start_returns_zero() {
        // elapsed == 0 < cliff → still 0
        assert_eq!(compute_vested(TOTAL, START, CLIFF, DUR, START), 0);
    }

    // ── Cliff boundary ───────────────────────────────────────────────────────
    #[test]
    fn one_second_before_cliff_returns_zero() {
        assert_eq!(compute_vested(TOTAL, START, CLIFF, DUR, START + CLIFF - 1), 0);
    }

    #[test]
    fn exactly_at_cliff_returns_cliff_fraction() {
        // At 1 yr of 4 yr → 25 %
        let vested   = compute_vested(TOTAL, START, CLIFF, DUR, START + CLIFF);
        let expected = TOTAL * CLIFF as u128 / DUR as u128; // 250_000
        assert_eq!(vested, expected);
    }

    // ── Mid-vesting linear ───────────────────────────────────────────────────
    #[test]
    fn half_duration_returns_half_total() {
        let vested = compute_vested(TOTAL, START, CLIFF, DUR, START + DUR / 2);
        assert_eq!(vested, TOTAL / 2); // 500_000
    }

    #[test]
    fn three_quarters_duration() {
        let vested = compute_vested(TOTAL, START, CLIFF, DUR, START + DUR * 3 / 4);
        assert_eq!(vested, TOTAL * 3 / 4); // 750_000
    }

    // ── Fully vested ─────────────────────────────────────────────────────────
    #[test]
    fn at_full_duration_returns_total() {
        assert_eq!(compute_vested(TOTAL, START, CLIFF, DUR, START + DUR), TOTAL);
    }

    #[test]
    fn past_duration_capped_at_total() {
        assert_eq!(
            compute_vested(TOTAL, START, CLIFF, DUR, START + DUR + 999_999),
            TOTAL
        );
    }

    // ── No-cliff (immediate linear) ──────────────────────────────────────────
    #[test]
    fn no_cliff_at_start_is_zero() {
        // elapsed == 0 → 0 * total / dur == 0
        assert_eq!(compute_vested(TOTAL, START, 0, DUR, START), 0);
    }

    #[test]
    fn no_cliff_quarter_vests_correctly() {
        let vested = compute_vested(TOTAL, START, 0, DUR, START + DUR / 4);
        assert_eq!(vested, TOTAL / 4); // 250_000
    }

    #[test]
    fn no_cliff_fully_vests_at_end() {
        assert_eq!(compute_vested(TOTAL, START, 0, DUR, START + DUR), TOTAL);
    }

    // ── Edge cases ───────────────────────────────────────────────────────────
    #[test]
    fn zero_total_always_zero() {
        assert_eq!(compute_vested(0, START, CLIFF, DUR, START + DUR), 0);
    }

    #[test]
    fn zero_duration_always_zero() {
        // Guard: zero duration is rejected at grant creation,
        // but the pure function must not panic.
        assert_eq!(compute_vested(TOTAL, START, 0, 0, START + 1), 0);
    }

    #[test]
    fn very_large_total_no_overflow() {
        // u128::MAX / 2 well within saturating_mul range
        let big = u128::MAX / 2;
        let vested = compute_vested(big, START, CLIFF, DUR, START + DUR);
        assert_eq!(vested, big, "fully vested large amount must equal total");
    }

    #[test]
    fn cliff_equals_duration_vests_all_at_cliff() {
        // cliff == duration → first eligible second returns full amount
        let vested = compute_vested(TOTAL, START, DUR, DUR, START + DUR);
        assert_eq!(vested, TOTAL);
    }

    #[test]
    fn single_second_duration() {
        assert_eq!(compute_vested(TOTAL, START, 0, 1, START),     0);
        assert_eq!(compute_vested(TOTAL, START, 0, 1, START + 1), TOTAL);
    }

    #[test]
    fn start_at_zero_epoch() {
        // start == 0, 1-year cliff, 4-year duration
        assert_eq!(compute_vested(TOTAL, 0, CLIFF, DUR, 0),        0);
        assert_eq!(compute_vested(TOTAL, 0, CLIFF, DUR, CLIFF - 1), 0);
        let expected = TOTAL * CLIFF as u128 / DUR as u128;
        assert_eq!(compute_vested(TOTAL, 0, CLIFF, DUR, CLIFF),    expected);
        assert_eq!(compute_vested(TOTAL, 0, CLIFF, DUR, DUR),      TOTAL);
    }
}
