@echo off
REM Iniciar Vipers.bat
REM
REM Duplo clique aqui sobe a API e o app desktop juntos, sem precisar abrir
REM terminal nenhum na mão. Deixa este arquivo na raiz do projeto.
REM
REM O QUE ELE FAZ:
REM   1. Compila a API se ainda não tiver um .jar pronto (só na primeira vez -
REM      as próximas execuções pulam essa etapa e abrem bem mais rápido)
REM   2. Sobe a API numa janela separada (minimizada)
REM   3. Espera a API responder antes de abrir o app
REM   4. Abre o app desktop

setlocal enabledelayedexpansion
cd /d "%~dp0"

set JAR_API=muaythai-api\target\app.jar

echo ============================================
echo   Vipers Fight Team - Iniciando o sistema
echo ============================================
echo.

REM ---------- 1. Compila a API se necessario ----------
if not exist "%JAR_API%" (
    echo [1/3] Primeira vez rodando - compilando a API, aguarde...
    pushd muaythai-api
    call mvn -q clean package -DskipTests
    popd

    REM Acha o .jar que o Maven gerou (nome varia com a versao no pom.xml) e
    REM copia com um nome fixo, pra sempre sabermos onde procurar da proxima vez.
    for %%F in (muaythai-api\target\*.jar) do (
        echo %%~nF | findstr /v /i "sources" >nul && copy /y "%%F" "%JAR_API%" >nul
    )

    if not exist "%JAR_API%" (
        echo.
        echo [ERRO] Nao foi possivel compilar a API. Confira se o Maven esta instalado
        echo        e no PATH do sistema, e se nao houve erro de compilacao acima.
        pause
        exit /b 1
    )
) else (
    echo [1/3] API ja compilada - pulando build. ^(Apague %JAR_API% para forcar recompilar.^)
)

REM ---------- 2. Sobe a API numa janela minimizada ----------
echo [2/3] Iniciando a API em segundo plano...
start "Vipers - API (pode minimizar, nao feche)" /min java -jar "%JAR_API%"

REM ---------- 3. Espera a API responder antes de abrir a tela ----------
echo       Aguardando a API ficar pronta...
set TENTATIVAS=0
:esperar_api
set /a TENTATIVAS+=1
curl -s -o nul -w "%%{http_code}" http://localhost:8080/actuator/health | findstr "200" >nul
if errorlevel 1 (
    if !TENTATIVAS! GEQ 60 (
        echo.
        echo [ERRO] A API demorou demais para responder. Confira a janela "Vipers - API" que abriu.
        pause
        exit /b 1
    )
    timeout /t 1 /nobreak >nul
    goto esperar_api
)

REM ---------- 4. Abre o app desktop ----------
echo [3/3] Abrindo o aplicativo...
pushd muaythai-desktop-app
if not exist "node_modules" (
    echo       Primeira vez - instalando dependencias do app, aguarde...
    call npm install
)
call npm start
popd

echo.
echo App fechado. A janela da API continua aberta minimizada - feche-a manualmente
echo se quiser desligar o sistema por completo.
pause
