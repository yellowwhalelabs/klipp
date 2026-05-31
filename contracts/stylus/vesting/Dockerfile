# KLIPP Vesting — Stylus build + deploy container
#
# Build:   docker build -t klipp-vesting .
# Check:   docker run --rm klipp-vesting check --endpoint https://sepolia-rollup.arbitrum.io/rpc
# Deploy:  docker run --rm -e PRIVATE_KEY=0x... klipp-vesting deploy \
#            --endpoint https://sepolia-rollup.arbitrum.io/rpc \
#            --private-key $PRIVATE_KEY

# cargo-stylus 0.10.x requires rustc >= 1.91
FROM rust:1.96-bookworm AS base

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# WASM target
RUN rustup target add wasm32-unknown-unknown

# Install cargo-stylus
RUN cargo install cargo-stylus

WORKDIR /app

# ── Copy source ───────────────────────────────────────────────────────────────
COPY Cargo.toml ./
COPY src/ ./src/

# Compile to WASM (contract feature enables Stylus entry point)
RUN cargo build --features contract --target wasm32-unknown-unknown --release

ENTRYPOINT ["cargo", "stylus"]
CMD ["check"]
