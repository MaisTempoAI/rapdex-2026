-- Adiciona valor 'trial' ao enum plano_tipo
-- Necessário para o RPC create_account usado no fluxo de cadastro self-service

ALTER TYPE plano_tipo ADD VALUE IF NOT EXISTS 'trial';
