#!/bin/bash
npm ci
mkdir -p static/webfonts
cp ./node_modules/@fortawesome/fontawesome-free/webfonts/* ./static/webfonts/

if [ -d .git ]; then
  mkdir -p .git/hooks
  cp .githooks/pre-push .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
fi
