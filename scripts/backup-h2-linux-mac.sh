#!/usr/bin/env bash
# backup-h2-linux-mac.sh
#
# Faz uma cópia de segurança do banco H2 local (o mesmo arquivo que a API usa
# quando você roda direto com "mvn spring-boot:run", sem Docker). Pensado pra
# rodar sozinho todo dia via cron - ver instruções no README.
#
# Se você roda com Docker Compose, use "backup-docker-volumes.sh" em vez
# deste aqui - o banco fica dentro de um volume Docker, não num arquivo comum.

set -euo pipefail

# ---------- CONFIGURAÇÃO (ajuste aqui) ----------

# Caminho do arquivo do banco H2 (mesmo valor implícito de DB_URL em application.properties)
ARQUIVO_BANCO="$HOME/banco_tatame.mv.db"

# Pasta onde os backups vão ficar. Aponte para uma pasta sincronizada do
# Google Drive/Dropbox se quiser backup na nuvem sem precisar de API.
PASTA_DESTINO="$HOME/vipers-backups"

# Quantos dias de backup manter
DIAS_PARA_MANTER=30

# ---------- NÃO PRECISA MEXER DAQUI PRA BAIXO ----------

if [ ! -f "$ARQUIVO_BANCO" ]; then
    echo "[ERRO] Banco não encontrado em: $ARQUIVO_BANCO" >&2
    echo "Confira o valor de DB_URL em application.properties se o caminho for diferente." >&2
    exit 1
fi

mkdir -p "$PASTA_DESTINO"

DATA_HORA=$(date +"%Y-%m-%d_%H%M")
DESTINO="$PASTA_DESTINO/banco_tatame_${DATA_HORA}.mv.db"

cp "$ARQUIVO_BANCO" "$DESTINO"
echo "[OK] Backup criado: $DESTINO"

# Remove backups mais antigos que $DIAS_PARA_MANTER dias
find "$PASTA_DESTINO" -name "banco_tatame_*.mv.db" -mtime "+$DIAS_PARA_MANTER" -print -delete |
    while read -r removido; do echo "Removido backup antigo: $removido"; done

echo "Backup concluído com sucesso."
