# Chrome Extension Release Packager for TabFlow Pro
$ErrorActionPreference = "Stop"

$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$name = "tabflow-pro"
$distDir = "dist/${name}-v${version}"
$zipFile = "${distDir}.zip"

Write-Host "`n⚡ TabFlow Pro Release Packager" -ForegroundColor Cyan
Write-Host "   Version: $version" -ForegroundColor White
Write-Host ""

# Exclude list
$excludeNames = @('.git', 'node_modules', 'dist', 'scripts', '.agents',
                   '.gitignore', '.prettierrc', 'tsconfig.json',
                   'package.json', 'package-lock.json',
                   'STORE_LISTING_DRAFT.md', 'CHROME_WEBSTORE_CHECKLIST.md',
                   'CHANGELOG.md', 'README.md',
                   'task.md', 'walkthrough.md', 'implementation_plan.md')

# Clean previous build
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

Write-Host "📦 Copying files..." -ForegroundColor Yellow

# Copy all needed files
$items = Get-ChildItem -Path . -Exclude $excludeNames
foreach ($item in $items) {
    $skip = $false
    foreach ($ex in $excludeNames) {
        if ($item.Name -eq $ex) { $skip = $true; break }
    }
    if ($skip) { continue }

    if ($item.PSIsContainer) {
        Copy-Item $item.FullName -Destination "$distDir/$($item.Name)" -Recurse
        Write-Host "   📂 $($item.Name)/" -ForegroundColor DarkGray
    } else {
        Copy-Item $item.FullName -Destination $distDir
        Write-Host "   📄 $($item.Name)" -ForegroundColor DarkGray
    }
}

# Always include PRIVACY.md
if (Test-Path "PRIVACY.md") {
    Copy-Item "PRIVACY.md" -Destination $distDir
    Write-Host "   📄 PRIVACY.md (included)" -ForegroundColor DarkGray
}

# Create ZIP
Write-Host "`n🔧 Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path "$distDir/*" -DestinationPath $zipFile -Force

$zipSize = (Get-Item $zipFile).Length / 1KB
Write-Host "`n✅ Package ready!" -ForegroundColor Green
Write-Host "   📦 $zipFile ($([math]::Round($zipSize, 1)) KB)" -ForegroundColor White
Write-Host "   🌐 Upload to: https://chrome.google.com/webstore/devconsole" -ForegroundColor Cyan
Write-Host ""
