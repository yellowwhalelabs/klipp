# KLIPP Vesting — Stylus build + deploy container
#
# Build:   docker build -t klipp-vesting .
# Check:   docker run --rm klipp-vesting check --endpoint https://sepolia-rollup.arbitrum.io/rpc
# Deploy:  docker run --rm klipp-vesting deploy \
#            --endpoint https://sepolia-rollup.arbitrum.io/rpc \
#            --private-key $DEPLOYER_PRIVATE_KEY

# cargo-stylus 0.10.x requires rustc >= 1.91
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

# cargo-stylus 0.5.x: no Stylus.toml required, simpler check/deploy
RUN cargo install cargo-stylus --version "^0.5"

WORKDIR /app
COPY Cargo.toml Stylus.toml ./
COPY src/ ./src/

# cargo stylus check compiles to wasm32-unknown-unknown internally
# (with the stylus-sdk "contract" feature active for the entrypoint)
ENTRYPOINT ["cargo", "stylus"]
# check validates the WASM without deploying; add --endpoint for on-chain activation check
CMD ["check"]
