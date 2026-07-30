-- V2: Adiciona a data de nascimento do aluno, usada pela rotina automática
-- de mensagem de aniversário (ver MensalidadeService.verificarAniversariantes()).
--
-- Nullable de propósito: alunos já cadastrados não têm esse dado ainda.
-- Enquanto o campo estiver NULL para um aluno, ele simplesmente não recebe
-- a mensagem de aniversário até que alguém edite o cadastro dele.

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_nascimento DATE;
