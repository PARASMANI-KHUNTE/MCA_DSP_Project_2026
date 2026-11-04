$ErrorActionPreference = 'Stop'

$frontendPath = Join-Path $PSScriptRoot 'frontend'
$packageManifest = Join-Path $frontendPath 'package.json'
$installedModules = Join-Path $frontendPath 'node_modules'

if (-not (Test-Path -LiteralPath $packageManifest)) {
    throw "Frontend package manifest not found: $packageManifest"
}
if (-not (Test-Path -LiteralPath $installedModules)) {
    throw "Frontend dependencies are missing. Run 'npm install' from the frontend directory first."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm is not available. Install Node.js and npm, then reopen PowerShell.'
}

Push-Location $PSScriptRoot
try {
    # Match the API's configured local CORS origin and the URL users should open.
    & npm.cmd --prefix frontend run dev -- --host localhost
    if ($LASTEXITCODE -ne 0) {
        throw "Vite exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
