#!pwsh
npm ci
mkdir -p static/webfonts
cp .\node_modules\@fortawesome\fontawesome-free\webfonts\* .\static\webfonts\
if (Test-Path .git) {
  New-Item -ItemType Directory -Force .git\hooks | Out-Null
  Copy-Item .githooks\pre-push .git\hooks\pre-push -Force
}
