#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OWNER="dwayneblack786"
GITHUB_OWNER="${GITHUB_OWNER:-$DEFAULT_OWNER}"

REPOS=(
  "ai-listing-agent"
  "services-java"
  "services-python"
  "product-management"
  "shared"
)

ENV_TARGETS=(
  "product-management/backend-node/.env:product-management/backend-node/.env.example"
  "product-management/frontend/.env:product-management/frontend/.env.example"
  "ai-listing-agent/backend-node/.env:ai-listing-agent/backend-node/.env.example"
  "ai-listing-agent/frontend/.env:ai-listing-agent/frontend/.env.example"
  "services-java/va-service/.env:services-java/va-service/.env.example"
  "shared/.env:shared/.env.example"
)

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N]: " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]]
}

clone_missing_repos() {
  echo
  echo "== Clone missing repositories =="
  for repo in "${REPOS[@]}"; do
    local repo_path="$ROOT_DIR/$repo"
    local repo_url="https://github.com/$GITHUB_OWNER/$repo.git"
    if [[ -d "$repo_path/.git" ]]; then
      echo "[skip] $repo already present"
    else
      echo "[clone] $repo_url"
      git -C "$ROOT_DIR" clone "$repo_url" "$repo"
    fi
  done
}

ensure_env_files() {
  echo
  echo "== Ensure env files =="
  for mapping in "${ENV_TARGETS[@]}"; do
    local target_rel="${mapping%%:*}"
    local example_rel="${mapping##*:}"
    local target="$ROOT_DIR/$target_rel"
    local example="$ROOT_DIR/$example_rel"

    if [[ -f "$target" ]]; then
      echo "[ok] $target_rel already exists"
      continue
    fi

    if [[ ! -f "$example" ]]; then
      echo "[warn] Missing example file: $example_rel"
      continue
    fi

    echo "[prompt] Missing $target_rel"
    if confirm "Create it from $example_rel with dummy values"; then
      cp "$example" "$target"
      echo "[created] $target_rel"
      echo "         Update dummy values before running production workloads."
    else
      echo "[skip] $target_rel"
    fi
  done
}

install_npm_deps() {
  local rel_dir="$1"
  local label="$2"
  local full_dir="$ROOT_DIR/$rel_dir"

  if [[ ! -f "$full_dir/package.json" ]]; then
    echo "[skip] $label (no package.json)"
    return
  fi

  echo "[npm] $label"
  if [[ -f "$full_dir/package-lock.json" ]]; then
    (cd "$full_dir" && npm ci)
  else
    (cd "$full_dir" && npm install)
  fi
}

install_java_deps() {
  local rel_dir="$1"
  local label="$2"
  local full_dir="$ROOT_DIR/$rel_dir"
  local mvnw

  if [[ -f "$full_dir/mvnw" ]]; then
    mvnw="./mvnw"
  elif [[ -f "$full_dir/mvnw.cmd" ]]; then
    mvnw="./mvnw.cmd"
  else
    echo "[skip] $label (no Maven wrapper)"
    return
  fi

  echo "[maven] $label"
  (cd "$full_dir" && $mvnw -DskipTests dependency:go-offline)
}

install_dependencies() {
  echo
  echo "== Install package dependencies =="

  install_java_deps "services-java/va-service" "services-java/va-service"
  install_java_deps "services-java/common-libs" "services-java/common-libs"

  install_npm_deps "product-management/backend-node" "product-management backend"
  install_npm_deps "product-management/frontend" "product-management frontend"

  install_npm_deps "shared" "shared"

  install_npm_deps "ai-listing-agent/backend-node" "ai-listing-agent backend"
  install_npm_deps "ai-listing-agent/frontend" "ai-listing-agent frontend"
}

show_compose_instructions() {
  echo
  echo "== Infrastructure compose files =="
  echo "Docker compose:  $ROOT_DIR/infra/docker-compose.dev.yml"
  echo "Podman compose:  $ROOT_DIR/infra/podman-compose.dev.yml"

  echo
  echo "To start infra with Docker:"
  echo "  docker compose -f infra/docker-compose.dev.yml up -d"

  echo
  echo "To start infra with Podman:"
  echo "  podman-compose -f infra/podman-compose.dev.yml up -d"
}

main() {
  echo "Workspace installer root: $ROOT_DIR"
  echo "GitHub owner: $GITHUB_OWNER"

  clone_missing_repos
  ensure_env_files
  install_dependencies
  show_compose_instructions

  echo
  echo "Done."
}

main "$@"
