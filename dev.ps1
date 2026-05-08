# 1. Pobierz IP, ignorując pętlę zwrotną (127.) oraz sieci Dockera (172.)
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -match "Wi-Fi|Ethernet" -and
    $_.IPAddress -notmatch "^127\." -and
    $_.IPAddress -notmatch "^172\."
}).IPAddress

# Jeśli znajdzie więcej niż jedno IP (np. kabel + WiFi), weź pierwsze z brzegu
if ($localIp -is [array]) { $localIp = $localIp[0] }

if (-not $localIp) {
    Write-Host ": Nie znaleziono poprawnego adresu IP (Wi-Fi/Ethernet)!" -ForegroundColor Red
    exit
}

Write-Host "Twoje wykryte IP: $localIp" -ForegroundColor Green

# 2. Ustaw zmienną środowiskową dla obecnego procesu i odpal Docker Compose
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $localIp
docker compose watch