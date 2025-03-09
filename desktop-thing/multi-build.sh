#!/bin/bash
set -e

echo "Starting build process..."
pnpm build

echo "Building Windows distribution..."
pnpm dist:win

echo "Building macOS distribution..."
pnpm dist:mac

echo "Building Linux distribution..."
pnpm dist:linux

echo "All builds completed successfully!"