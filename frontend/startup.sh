#!/bin/sh

if [ -f package.json ]; then
  # Install dependencies
  echo "Installing dependencies..."
  npm install
else
  echo "Error: package.json not found after initialization. Exiting."
  exit 1
fi

# Start dev server
echo "Starting dev server..."
npm run dev
