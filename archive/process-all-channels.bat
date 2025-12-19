@echo off
echo.
echo ========================================
echo PROCESSING ALL DISCORD EXPORTS
echo ========================================
echo.

node process-channel.js Adafruit_fpga
node process-channel.js Adafruit_helpwithhwdesign
node process-channel.js Amulius_arm
node process-channel.js Amulius_esp32
node process-channel.js Amulius_linux
node process-channel.js Amulius_risc-v
node process-channel.js CutFreedom_hwinfo
node process-channel.js CutFreedom_swinfo
node process-channel.js ElectronicRepair_laptops
node process-channel.js ElectronicRepair_pc-repair
node process-channel.js HardwayHacking_general-hacking
node process-channel.js HardwayHacking_hardware
node process-channel.js KiCad_general
node process-channel.js KiCad_pcb
node process-channel.js meshatastic_firmware
node process-channel.js meshatastic_flashingfw
node process-channel.js Meshtastic_firmware
node process-channel.js MisterFPGA_controllers
node process-channel.js MisterFPGA_mister-debug
node process-channel.js Rinkhals_HardwareHacking
node process-channel.js SDRplusplus_dsp
node process-channel.js SDRplusplus_programming
node process-channel.js STM32World_general
node process-channel.js STM32World_hardware

echo.
echo ========================================
echo ALL CHANNELS PROCESSED!
echo ========================================
echo.




