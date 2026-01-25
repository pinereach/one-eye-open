#!/bin/bash
# Sync lib files from src/lib to functions/lib for Pages Functions build

echo "Syncing lib files to functions/lib..."
cp src/lib/db.ts functions/lib/
cp src/lib/auth.ts functions/lib/
cp src/lib/matching.ts functions/lib/
cp src/lib/settlement.ts functions/lib/
echo "Done!"
