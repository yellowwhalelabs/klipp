# KLIPP Vesting — Stylus build + deploy container
#
# Build:   docker build -t klipp-vesting .
# Check:   docker run --rm klipp-vesting check --endpoint https://sepolia-rollup.arbitrum.io/rpc
# Deploy:  docker run --rm klipp-vesting deploy \
#            --endpoint https://sepolia-rollup.arbitrum.io/rpc \
#            --private-key $DEPLOYER_PRIVATE_KEY

FROM rust:1.96-bookworm AS builder

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# WASM target
RUN rustup target add wasm32-unknown-unknown

# Pin cargo-stylus to v0.6.3 — last release of the archived OffchainLabs/cargo-stylus
# repo. Does NOT require a Stylus.toml (the 0.10.x crate does). Matches CI.
RUN cargo install cargo-stylus --version 0.6.3

WORKDIR /app
# Linux build: keccak-asm's x86_64 assembly is available natively, so no
# keccak stub / [patch.crates-io] is needed (that was a Windows-only workaround).
COPY Cargo.toml ./
COPY src/ ./src/

# cargo stylus check compiles to wasm32-unknown-unknown internally
# (with the stylus-sdk "contract" feature active for the entrypoint)
ENTRYPOINT ["cargo", "stylus"]
# check validates the WASM without deploying; add --endpoint for on-chain activation check
CMD ["check"]
