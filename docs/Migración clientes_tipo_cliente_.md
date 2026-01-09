-- Migración clientes_tipo_cliente_check
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_tipo_cliente_check;

ALTER TABLE clientes
  ADD CONSTRAINT clientes_tipo_cliente_check
  CHECK (
    tipo_cliente::text = ANY (
      ARRAY['persona_fisica','persona_moral','fideicomiso']
    )
  );
