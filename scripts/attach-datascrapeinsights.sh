#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="https://github.com/boweazy/DataScrapeInsights.git"
SUBMODULE_PATH="vendors/DataScrapeInsights"

# If TARGET_REPO not provided, try current repo first, then known SFS repos.
if [[ "${TARGET_REPO:-}" != "" ]]; then
  REPOS=("$TARGET_REPO")
else
  REPOS=("." "SocialScaleBooster" "SFSDataQueryEngine" "SFSAPDemoCRM" "sfs-marketing-and-growth")
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing tool: $1" >&2; exit 1; }; }
need git; need jq; need npm

for repo in "${REPOS[@]}"; do
  if [[ "$repo" == "." ]]; then
    [[ -d ".git" ]] || { echo "Skip: . (no .git here)"; continue; }
  else
    [[ -d "$repo/.git" ]] || { echo "Skip: $repo (not here)"; continue; }
  fi

  echo "==> Wiring into $repo"
  pushd "$repo" >/dev/null

  mkdir -p vendors tools docs/integrations

  # Add submodule if not yet configured
  if ! git config -f .gitmodules --get-regexp "submodule\.${SUBMODULE_PATH//\//\.}\.url" >/dev/null 2>&1; then
    git submodule add "$UPSTREAM_URL" "$SUBMODULE_PATH"
  else
    echo "  - Submodule already listed in .gitmodules"
  fi

  # Ensure working tree exists and is current
  git submodule update --init --recursive "$SUBMODULE_PATH"
  git -C "$SUBMODULE_PATH" fetch --tags --prune || true
  git submodule update --remote --merge "$SUBMODULE_PATH" || true

  # Helper runner
  cat > tools/run-datascrape.sh <<'EOSH'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
VENDOR="$ROOT/vendors/DataScrapeInsights"
if [[ ! -d "$VENDOR" ]]; then
  echo "DataScrapeInsights not found at $VENDOR. Did you init submodules?" >&2; exit 1
fi
# Minimal .env once
if [[ ! -f "$VENDOR/.env" ]]; then
  cat > "$VENDOR/.env" <<'EOENV'
PORT=5179
NODE_ENV=development
# DATABASE_URL=
# REDIS_URL=
# PROXY_URL=
# SCRAPE_TARGETS=
# RATE_LIMIT_RPS=2
# LOG_LEVEL=info
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# HF_TOKEN=
EOENV
  echo "[DataScrapeInsights] Wrote default .env at $VENDOR/.env"
fi
# Keep .env local (untracked) inside submodule
EXCL="$VENDOR/.git/info/exclude"; mkdir -p "$(dirname "$EXCL")"
grep -qxF '.env' "$EXCL" 2>/dev/null || echo '.env' >> "$EXCL"

cd "$VENDOR"
if [[ -f package.json ]]; then npm ci; fi
if jq -e '.scripts.dev' package.json >/dev/null 2>&1; then
  npm run dev
elif jq -e '.scripts.start' package.json >/dev/null 2>&1; then
  npm run start
else
  echo "No dev/start script found. Add one in $VENDOR/package.json." >&2; exit 2
fi
EOSH
  chmod +x tools/run-datascrape.sh

  # Integration doc
  cat > docs/integrations/DataScrapeInsights.md <<'EOMD'
# DataScrapeInsights (git submodule)

Upstream: https://github.com/boweazy/DataScrapeInsights

## Run locally
```bash
bash tools/run-datascrape.sh
