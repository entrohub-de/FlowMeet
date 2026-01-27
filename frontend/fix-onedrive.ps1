# PowerShell script to exclude .next and node_modules from OneDrive sync
# This fixes "EBUSY: resource busy or locked" errors during development

Write-Host "Excluding development folders from OneDrive sync..." -ForegroundColor Cyan

$frontendPath = $PSScriptRoot
$nextPath = Join-Path $frontendPath ".next"
$nodeModulesPath = Join-Path $frontendPath "node_modules"

# Function to set OneDrive exclusion attribute
function Set-OneDriveExclusion {
    param([string]$path)

    if (Test-Path $path) {
        try {
            attrib +U $path /S /D
            Write-Host "Excluded: $path" -ForegroundColor Green
        } catch {
            Write-Host "Failed to exclude: $path" -ForegroundColor Red
            Write-Host "Error: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Not found (will be excluded when created): $path" -ForegroundColor Yellow
    }
}

# Exclude folders
Set-OneDriveExclusion $nextPath
Set-OneDriveExclusion $nodeModulesPath

Write-Host ""
Write-Host "Done! OneDrive will no longer sync these folders." -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
