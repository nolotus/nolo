#!/usr/bin/env bash
set -Eeuo pipefail

missing=()

if command -v dpkg-query &> /dev/null; then
  # Debian/Ubuntu
  required_packages=(
    libgtk-3-dev
    libwebkit2gtk-4.1-dev
    libayatana-appindicator3-dev
    librsvg2-dev
    patchelf
    rpm
  )
  for package in "${required_packages[@]}"; do
    if ! dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -q "install ok installed"; then
      missing+=("$package")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "[linux-desktop-deps] missing packages: ${missing[*]}" >&2
    echo "[linux-desktop-deps] install once on the runner:" >&2
    echo "sudo apt-get update && sudo apt-get install -y ${missing[*]}" >&2
    exit 1
  fi

elif command -v rpm &> /dev/null; then
  # Fedora/RHEL
  required_packages=(
    gtk3-devel
    webkit2gtk4.1-devel
    libappindicator-gtk3-devel
    librsvg2-devel
    patchelf
    rpm-build
  )
  for package in "${required_packages[@]}"; do
    if ! rpm -q "$package" &> /dev/null; then
      missing+=("$package")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "[linux-desktop-deps] missing packages: ${missing[*]}" >&2
    echo "[linux-desktop-deps] install once on the runner:" >&2
    echo "sudo dnf install -y ${missing[*]}" >&2
    exit 1
  fi

else
  echo "[linux-desktop-deps] Warning: Neither dpkg-query nor rpm found. Skipping dependency check." >&2
fi

echo "[linux-desktop-deps] ok"
