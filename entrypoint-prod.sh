#!/bin/sh
echo "Starting production server..."

mkdir -p prod/public

cd frontend || exit
echo "Installing frontend dependencies and building the client..."
npm install
npm run build

echo "Copying frontend build to production directory..."
cp -r ../frontend/dist/* ../prod/public

echo "Frontend build completed."

echo "Building backend server..."
cd ../backend || exit

echo "Installing backend dependencies..."
npm install && npm run build

echo "Copying backend server files to production directory..."
cp package.json ../prod
cp -r node_modules ../prod/node_modules
cp -r dist/shared ../prod/shared
cp -r dist/backend ../prod/backend

rm -rf /app/backend
rm -rf /app/shared
rm -rf /app/frontend

echo "Starting production server..."
cd /app/prod || exit
npm run prod

echo "Production server is running. Access it at ${VITE_SERVER_URL}"
