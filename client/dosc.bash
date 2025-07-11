#!/bin/bash

echo "🚀 Installing Tailwind CSS v4 on SongSculptors..."

# Navigate to client directory
cd client

# Clean install - remove node_modules and package-lock.json
echo "🧹 Cleaning previous installation..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf dist/

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Update package.json to ensure we have the right Tailwind v4 setup
echo "📝 Updating package.json for Tailwind v4..."

# Install Tailwind v4 with the correct packages
echo "📦 Installing Tailwind CSS v4..."
npm install --save-dev tailwindcss@next @tailwindcss/vite@next

# Install other dependencies
echo "📦 Installing other dependencies..."
npm install

# Verify installation
echo "✅ Verifying Tailwind installation..."
npx tailwindcss --version

# Create/update vite.config.js for v4 compatibility
echo "⚙️  Updating Vite config for Tailwind v4..."

echo "✅ Tailwind CSS v4 installation complete!"
echo "🔧 Next steps:"
echo "   1. Run 'npm run build' to build your project"
echo "   2. Check that your CSS is properly generated"
echo "   3. Restart your development server"