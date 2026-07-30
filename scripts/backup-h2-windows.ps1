# backup-h2-windows.ps1
#
# Faz uma cópia de segurança do banco H2 local (o mesmo arquivo que a API usa
# quando você roda pelo IntelliJ, sem Docker). Pensado pra rodar sozinho todo
# dia via Tarefas Agendadas do Windows - ver instruções no README.
#
# O QUE ELE FAZ:
#   1. Copia o arquivo do banco (banco_tatame.mv.db) com data/hora no nome
#   2. Guarda em uma pasta de backups (por padrão, dentro do seu usuário)
#   3. Apaga backups com mais de $DiasParaManter dias, pra não lotar o disco
#
# COMO USAR:
#   - Rodar manualmente:      .\backup-h2-windows.ps1
#   - Mandar pro Google Drive: troca $PastaDestino abaixo pelo caminho da
#     pasta sincronizada do Google Drive Desktop (ex.: "G:\Meu Drive\Backups-Vipers")
#     Assim, o Google Drive sincroniza sozinho - não precisa de API nem senha.

# ---------- CONFIGURAÇÃO (ajuste aqui) ----------

# Caminho do arquivo do banco H2. Por padrão fica na pasta do seu usuário do
# Windows, com o mesmo nome configurado em application.properties (DB_URL).
$ArquivoBanco = "$env:USERPROFILE\banco_tatame.mv.db"

# Pasta onde os backups vão ficar. Troque pelo caminho de uma pasta do Google
# Drive Desktop / OneDrive se quiser sincronização automática na nuvem.
$PastaDestino = "$env:USERPROFILE\vipers-backups"

# Quantos dias de backup manter (backups mais antigos que isso são apagados)
$DiasParaManter = 30

# ---------- NÃO PRECISA MEXER DAQUI PRA BAIXO ----------

if (-not (Test-Path $ArquivoBanco)) {
    Write-Host "[ERRO] Banco não encontrado em: $ArquivoBanco" -ForegroundColor Red
    Write-Host "Confira o valor de DB_URL em application.properties se o caminho for diferente." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $PastaDestino)) {
    New-Item -ItemType Directory -Path $PastaDestino | Out-Null
    Write-Host "Pasta de backups criada em: $PastaDestino"
}

$dataHora = Get-Date -Format "yyyy-MM-dd_HHmm"
$nomeArquivoDestino = "banco_tatame_$dataHora.mv.db"
$caminhoCompleto = Join-Path $PastaDestino $nomeArquivoDestino

try {
    Copy-Item -Path $ArquivoBanco -Destination $caminhoCompleto -ErrorAction Stop
    Write-Host "[OK] Backup criado: $caminhoCompleto" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha ao copiar o banco: $_" -ForegroundColor Red
    Write-Host "Dica: se a API estiver rodando, o H2 pode estar com o arquivo em uso." -ForegroundColor Yellow
    Write-Host "O modo AUTO_SERVER=TRUE (já configurado no projeto) normalmente permite copiar mesmo assim," -ForegroundColor Yellow
    Write-Host "mas se der erro, tente rodar o backup com a API parada." -ForegroundColor Yellow
    exit 1
}

# Limpa backups antigos
$limite = (Get-Date).AddDays(-$DiasParaManter)
$antigos = Get-ChildItem -Path $PastaDestino -Filter "banco_tatame_*.mv.db" |
    Where-Object { $_.LastWriteTime -lt $limite }

if ($antigos.Count -gt 0) {
    $antigos | Remove-Item -Force
    Write-Host "Removidos $($antigos.Count) backup(s) com mais de $DiasParaManter dias."
}

Write-Host "Backup concluído com sucesso."
