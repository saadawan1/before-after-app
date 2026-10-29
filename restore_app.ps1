# Restore Original Village App Script
# This script assembles the clean original app from the backup file
# by skipping the corrupted lines

Write-Host "Reading backup file..." -ForegroundColor Green

# Read the backup file
$backupContent = Get-Content "village_app.js.backup"

# Section 1: Lines 1-1020 (imports, helpers, screens, CompositeCard)
$section1 = $backupContent[0..1019]  # Arrays are 0-indexed

# Section 2: Lines 1174-1783 (correct MainScreen, DrawerNavigator, partial App)
# Skip lines 1021-1173 which contain duplicate/incomplete MainScreen
$section2 = $backupContent[1173..1782]  # 1174-1783 in 1-indexed = 1173-1782 in 0-indexed

# Section 3: Lines 1786-2211 (rest of App, registerRootComponent, all styles)
# Skip lines 1784-1785 which contain GPS_REQUIRED_VIDEOS_KEY references
$section3 = $backupContent[1785..2210]  # 1786-2211 in 1-indexed = 1785-2210 in 0-indexed

# Combine all sections
Write-Host "Assembling clean file..." -ForegroundColor Green
$cleanContent = $section1 + $section2 + $section3

# Write to village_app.js
Write-Host "Writing to village_app.js..." -ForegroundColor Green
$cleanContent | Set-Content "village_app.js" -Encoding UTF8

Write-Host ""
Write-Host "Restoration complete!" -ForegroundColor Green
Write-Host "  Original lines: 2211" -ForegroundColor Cyan
Write-Host "  Corrupted lines removed: 155 (lines 1021-1173 + 1784-1785)" -ForegroundColor Yellow
Write-Host "  Clean file lines: 2056" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run: npx expo start" -ForegroundColor Cyan
