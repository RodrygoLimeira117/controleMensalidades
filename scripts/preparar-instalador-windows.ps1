# preparar-instalador-windows.ps1
#
# Automatiza TODO o trabalho de preparar o instalador "tudo junto" do app:
#   1. Compila a API Java (mvn package) e copia o .jar pro app desktop
#   2. Baixa um Java portátil (JRE) - assim quem instala o app não precisa
#      ter Java instalado na própria máquina
#   3. Instala as dependências do worker do WhatsApp (inclui o download do
#      Chromium que o Puppeteer usa por baixo dos panos)
#   4. Instala as dependências do Electron
#   5. Gera o instalador (.exe) com o electron-builder
#
# PRÉ-REQUISITOS NA SUA MÁQUINA (só pra gerar o instalador, não pra quem for usar):
#   - Java 21 + Maven (pra compilar a API)
#   - Node.js + npm (pra rodar o Electron/electron-builder)
#
# Rode este script a partir da RAIZ do repositório:
#   .\scripts\preparar-instalador-windows.ps1

$ErrorActionPreference = "Stop"

$RaizProjeto = Split-Path -Parent $PSScriptRoot
$PastaApi = Join-Path $RaizProjeto "muaythai-api"
$PastaWorker = Join-Path $RaizProjeto "muaythai-whatsapp-worker"
$PastaDesktop = Join-Path $RaizProjeto "muaythai-desktop-app"
$PastaBackendDestino = Join-Path $PastaDesktop "backend"
$PastaRuntimeDestino = Join-Path $PastaDesktop "runtime\jre-win-x64"

function Escrever-Etapa($texto) {
    Write-Host ""
    Write-Host "==> $texto" -ForegroundColor Cyan
}

# ---------- 1. Compilar a API ----------
Escrever-Etapa "Compilando a API (mvn clean package)..."
Push-Location $PastaApi
try {
    mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw "Maven falhou. Confira os erros acima." }
} finally {
    Pop-Location
}

$jarGerado = Get-ChildItem -Path (Join-Path $PastaApi "target") -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*sources*" } |
    Select-Object -First 1

if (-not $jarGerado) { throw "Nenhum .jar encontrado em muaythai-api\target. O build falhou?" }

New-Item -ItemType Directory -Path $PastaBackendDestino -Force | Out-Null
Copy-Item $jarGerado.FullName (Join-Path $PastaBackendDestino "app.jar") -Force
Write-Host "[OK] $($jarGerado.Name) copiado para backend\app.jar" -ForegroundColor Green

# ---------- 2. Baixar o Java portátil (JRE), se ainda não tiver ----------
if (Test-Path (Join-Path $PastaRuntimeDestino "bin\java.exe")) {
    Write-Host "[OK] JRE portátil já existe em runtime\jre-win-x64 - pulando download." -ForegroundColor Green
} else {
    Escrever-Etapa "Baixando um Java portátil (Eclipse Temurin JRE 21, Windows x64)..."
    New-Item -ItemType Directory -Path (Split-Path $PastaRuntimeDestino -Parent) -Force | Out-Null

    $urlJre = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk"
    $zipTemp = Join-Path $env:TEMP "jre-temurin-21.zip"

    Invoke-WebRequest -Uri $urlJre -OutFile $zipTemp
    $pastaExtracaoTemp = Join-Path $env:TEMP "jre-temurin-21-extraido"
    if (Test-Path $pastaExtracaoTemp) { Remove-Item $pastaExtracaoTemp -Recurse -Force }
    Expand-Archive -Path $zipTemp -DestinationPath $pastaExtracaoTemp

    # O zip vem com uma pasta interna tipo "jdk-21.0.x+y-jre" - movemos o conteúdo dela pra runtime\jre-win-x64
    $pastaInterna = Get-ChildItem -Path $pastaExtracaoTemp -Directory | Select-Object -First 1
    Move-Item $pastaInterna.FullName $PastaRuntimeDestino

    Remove-Item $zipTemp -Force
    Remove-Item $pastaExtracaoTemp -Recurse -Force

    Write-Host "[OK] JRE portátil pronto em runtime\jre-win-x64" -ForegroundColor Green
}

# ---------- 3. Dependências do worker do WhatsApp ----------
Escrever-Etapa "Instalando dependências do worker do WhatsApp (inclui download do Chromium, pode demorar)..."
Push-Location $PastaWorker
try {
    npm install --omit=dev
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou no worker do WhatsApp." }
} finally {
    Pop-Location
}

# ---------- 4. Dependências do Electron ----------
Escrever-Etapa "Instalando dependências do app desktop..."
Push-Location $PastaDesktop
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou no app desktop." }

    # ---------- 5. Gerar o instalador ----------
    Escrever-Etapa "Gerando o instalador (.exe) com electron-builder..."
    npm run dist
    if ($LASTEXITCODE -ne 0) { throw "electron-builder falhou." }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Instalador gerado em: muaythai-desktop-app\dist\" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
