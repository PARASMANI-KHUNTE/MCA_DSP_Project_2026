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
    & npm.cmd --prefix frontend run dev -- --host 127.0.0.1
    if ($LASTEXITCODE -ne 0) {
        throw "Vite exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
