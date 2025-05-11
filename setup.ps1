#!pwsh
npm install @fortawesome/fontawesome-free
mkdir -p static/webfonts
mkdir -p static/fonts
cp '.\node_modules\@fortawesome\fontawesome-free\webfonts\*' .\static\webfonts\
cp '.\node_modules\@fortawesome\fontawesome-free\webfonts\*' .\static\fonts\
