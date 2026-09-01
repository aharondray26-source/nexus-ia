#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
swiftc -O -target arm64-apple-macos13.0 -framework Cocoa outils/icone/main.swift -o /tmp/nexus-icone
exec /tmp/nexus-icone
