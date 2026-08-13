#!pwsh
npm ci
mkdir -p static/webfonts
cp .\node_modules\@fortawesome\fontawesome-free\webfonts\* .\static\webfonts\
