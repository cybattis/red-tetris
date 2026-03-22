#!/bin/sh
echo "Starting production server..."

cd frontend || exit
echo "Installing frontend dependencies and building the app..."
npm install && npm run build

echo "Starting backend server..."
cd ../backend || exit

echo "Copy frontend build"

echo "Installing backend dependencies..."
npm install && npm run build

cp -r ../frontend/dist ./dist/public

npm run prod

echo "Production server is running. Access the app at http://localhost:3000"
