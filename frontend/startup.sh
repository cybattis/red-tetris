#!/bin/sh

# If package.json doesn't exist, we need to initialize the app
if [ ! -f package.json ]; then
  echo "Initializing Vite React TypeScript template..."

  # create-vite fails if directory is not empty, so we create in /tmp first
  cd /tmp || exit
  npm create vite@latest temp-app -- --template react-ts

  # Move files to /app
  cd temp-app || exit
  cp -r . /app/
  cd /app || exit

  # Clean up
  rm -rf /tmp/temp-app
  echo "Template initialized."
fi

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
