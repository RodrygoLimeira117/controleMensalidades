#!/usr/bin/env bash
# backup-docker-volumes.sh
#
# Faz backup dos volumes Docker usados pelo docker-compose.yml deste projeto:
#   - banco-dados       (banco H2)
#   - whatsapp-sessao   (login autenticado do WhatsApp - evita escanear o QR de novo)
#
# Funciona rodando um container temporário que só monta o volume e empacota
# o conteúdo num .tar.gz - é a forma padrão de fazer backup de volume Docker,
# já que o conteúdo não fica visível direto no sistema de arquivos do host.
#
# Use este script se você roda o projeto via "docker compose up".
# Se você roda direto com "mvn spring-boot:run" (sem Docker), use
# backup-h2-linux-mac.sh ou backup-h2-windows.ps1 em vez deste.

set -euo pipefail

# ---------- CONFIGURAÇÃO (ajuste aqui) ----------

# Pasta onde os backups vão ficar. Aponte para uma pasta sincronizada do
# Google Drive/Dropbox se quiser backup na nuvem sem precisar de API.
PASTA_DESTINO="$HOME/vipers-backups"

# Nomes dos volumes (têm o prefixo do nome da pasta do projeto - ajuste se
# o "docker compose ps -q" ou "docker volume ls" mostrar nomes diferentes)
PREFIXO_PROJETO=$(basename "$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")" 2>/dev/null || echo "controlemensalidades-main")
VOLUME_BANCO="${PREFIXO_PROJETO}_banco-dados"
VOLUME_WHATSAPP="${PREFIXO_PROJETO}_whatsapp-sessao"

DIAS_PARA_MANTER=30

# ---------- NÃO PRECISA MEXER DAQUI PRA BAIXO ----------

mkdir -p "$PASTA_DESTINO"
DATA_HORA=$(date +"%Y-%m-%d_%H%M")

backup_volume() {
    local volume_nome="$1"
    local nome_arquivo="$2"

    if ! docker volume inspect "$volume_nome" >/dev/null 2>&1; then
        echo "[AVISO] Volume '$volume_nome' não encontrado - pulando. Rode 'docker volume ls' pra ver os nomes reais." >&2
        return
    fi

    local destino="$PASTA_DESTINO/${nome_arquivo}_${DATA_HORA}.tar.gz"

    docker run --rm \
        -v "${volume_nome}:/origem:ro" \
        -v "${PASTA_DESTINO}:/destino" \
        alpine \
        tar czf "/destino/$(basename "$destino")" -C /origem .

    echo "[OK] Backup criado: $destino"
}

backup_volume "$VOLUME_BANCO" "banco-dados"
backup_volume "$VOLUME_WHATSAPP" "whatsapp-sessao"

# Remove backups mais antigos que $DIAS_PARA_MANTER dias
find "$PASTA_DESTINO" -name "*.tar.gz" -mtime "+$DIAS_PARA_MANTER" -print -delete |
    while read -r removido; do echo "Removido backup antigo: $removido"; done

echo "Backup concluído com sucesso."
