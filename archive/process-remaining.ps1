$channels = @(
    "ElectronicRepair_laptops",
    "ElectronicRepair_pc-repair",
    "HardwayHacking_general-hacking",
    "HardwayHacking_hardware",
    "KiCad_general",
    "KiCad_pcb",
    "meshatastic_firmware",
    "meshatastic_flashingfw",
    "Meshtastic_firmware",
    "MisterFPGA_controllers",
    "MisterFPGA_mister-debug",
    "Rinkhals_HardwareHacking",
    "SDRplusplus_dsp",
    "SDRplusplus_programming",
    "STM32World_general",
    "STM32World_hardware"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PROCESSING REMAINING 16 CHANNELS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$total = $channels.Count
$current = 0

foreach ($channel in $channels) {
    $current++
    
    Write-Host ""
    Write-Host "[$current/$total] Processing: $channel" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Gray
    
    node process-channel.js $channel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SUCCESS: $channel" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: $channel" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ALL CHANNELS COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Count results
$filteredFiles = Get-ChildItem -Filter "*_filtered_messages.json" | Measure-Object
Write-Host "📊 Total channels processed: $($filteredFiles.Count)" -ForegroundColor Green
Write-Host ""




