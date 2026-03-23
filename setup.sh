#!/bin/bash
npm install @fortawesome/fontawesome-free
mkdir -p static/webfonts
cp ./node_modules/@fortawesome/fontawesome-free/webfonts/* ./static/webfonts/
