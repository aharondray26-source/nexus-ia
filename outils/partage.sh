#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
swiftc -O -target arm64-apple-macos13.0 -framework Cocoa outils/partage/main.swift -o /tmp/nexus-partage
exec /tmp/nexus-partage
