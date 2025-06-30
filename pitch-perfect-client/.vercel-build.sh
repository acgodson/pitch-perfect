#!/bin/bash

# Vercel build script for CCIP SDK submodule

echo "🔄 Initializing Git submodules..."
git submodule update --init --recursive

echo "📦 Installing CCIP SDK dependencies..."
cd ../../ccip-javascript-sdk
pnpm install

echo "🔨 Building CCIP SDK..."
pnpm build

echo "🚀 Building Pitch Perfect Client..."
cd ../pitch-perfect/pitch-perfect-client
npm run build