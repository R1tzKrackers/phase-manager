#!/bin/bash
# Phase Manager Setup Script (Unix/Mac)
# Usage: curl -fsSL https://raw.githubusercontent.com/R1tzKrackers/phase-manager/main/setup.sh | bash

set -e

PM_URL="https://github.com/R1tzKrackers/phase-manager/archive/refs/heads/main.tar.gz"

echo ""
echo "========================================"
echo "  Phase Manager Setup"
echo "========================================"
echo ""

# Check if already setup
if [ -d ".phase-manager" ]; then
    echo "[!] .phase-manager already exists. Aborting."
    exit 1
fi

# Download and extract Phase Manager
echo "[1/4] Downloading Phase Manager..."
curl -sL "$PM_URL" | tar xz

echo "[2/4] Installing..."
mv phase-manager-main .phase-manager

echo "[3/4] Cleaning up..."
rm -f .phase-manager/setup.ps1 .phase-manager/setup.sh .phase-manager/README.md

# Create project-config.yml template
echo "[4/4] Creating configuration files..."
cat > project-config.yml << 'EOF'
# Project Configuration
# This file is used by Phase Manager to configure your project

project:
  name: ""
  description: ""

directories:
  ux_spec: docs/ux
  detail_spec: docs/detail
  impl: src
  test: tests

roles:
  design: Designer
  impl: Developer
  setup: SetupAgent

# Framework configuration (set by AI during Framework Initialize phase)
framework:
  id: ""
  repo_url: ""
  version: ""
EOF

# Create empty history file
touch .phase-manager-history.yml

# Create startup script
cat > phase-manager.sh << 'STARTUP'
#!/bin/bash
# Phase Manager Startup Script

PM_ROOT="$(dirname "$0")/.phase-manager"
TOOLS_DIR="$PM_ROOT/tools"

echo ""
echo "========================================"
echo "  Phase Manager - Starting..."
echo "========================================"
echo ""

if [ ! -d "$PM_ROOT" ]; then
    echo "[!] .phase-manager not found. Run setup first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[!] Node.js is required."
    exit 1
fi

if [ ! -d "$TOOLS_DIR/node_modules" ]; then
    echo "[*] Installing dependencies..."
    cd "$TOOLS_DIR"
    npm install
    cd - > /dev/null
fi

echo "[*] Starting server..."
cd "$TOOLS_DIR"
node server.js
STARTUP

chmod +x phase-manager.sh

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Run: ./phase-manager.sh"
echo "  2. Follow the Framework Initialize phase"
echo ""
