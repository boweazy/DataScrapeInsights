#!/usr/bin/env bash
set -euo pipefail
# Thin wrapper so you can just: bash attach-datascrapeinsights.sh
# Use TARGET_REPO="." to apply to THIS repo. Or set to a folder name.
TARGET_REPO="${TARGET_REPO:-.}"
export TARGET_REPO
bash scripts/attach-datascrapeinsights.sh