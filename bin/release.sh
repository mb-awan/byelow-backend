#!/bin/bash
read -p "Are you sure you want to release a new version? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm run release
else
  echo "Release canceled."
fi
