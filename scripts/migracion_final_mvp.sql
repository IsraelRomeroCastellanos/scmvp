-- =============================================
-- PLATAFORMA DE CUMPLIMIENTO - Migración Final MVP
-- Compatible con PostgreSQL en Render
-- =============================================

-- 1. Asegurar campo `activo` en usuarios (si no existe)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Asegurar campo `actualizado_en` en usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Índices para optimizar consultas frecuentes

-- Índice para búsquedas por email (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Índice para filtrar por rol y estado
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo ON usuarios(rol, activo);

-- Índice para búsquedas por empresa (clientes y transacciones)
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_cliente ON transacciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha_operacion);

-- Índice para alertas activas
CREATE INDEX IF NOT EXISTS idx_alertas_activas ON alertas(estado) WHERE estado = 'activa';

-- 4. Restricciones adicionales para calidad de datos

-- Asegurar que el porcentaje de cumplimiento esté entre 0 y 100
ALTER TABLE clientes 
ADD CONSTRAINT chk_porcentaje_cumplimiento 
CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100);

-- Asegurar que el nivel de riesgo sea válido
ALTER TABLE matrices_riesgo 
ADD CONSTRAINT chk_nivel_riesgo 
CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto'));

-- 5. Comentarios para documentación

COMMENT ON TABLE usuarios IS 'Usuarios del sistema: admin, consultor, cliente';
COMMENT ON COLUMN usuarios.rol IS 'admin: acceso total; consultor: acceso a todas las empresas; cliente: acceso a su empresa';
COMMENT ON COLUMN usuarios.activo IS 'Indicador de desactivación lógica (no se borran usuarios por normativa)';
COMMENT ON TABLE empresas IS 'Empresas clientes del sistema (personas físicas o morales)';
COMMENT ON TABLE clientes IS 'Clientes finales asociados a una empresa';
COMMENT ON TABLE transacciones IS 'Operaciones mensuales para perfil transaccional';
COMMENT ON TABLE barridos_listas IS 'Resultados de cotejo contra listas de PPE, sanciones y países de riesgo';
COMMENT ON TABLE matrices_riesgo IS 'Asignación de nivel de riesgo por cliente';
COMMENT ON TABLE alertas IS 'Alertas generadas por umbrales o perfiles anómalos';

-- 6. Política de auditoría básica (solo en planes Pro de Render, pero preparamos la estructura)

-- Tabla de logs (opcional, para futura implementación)
-- CREATE TABLE IF NOT EXISTS logs_auditoria (
--   id SERIAL PRIMARY KEY,
--   usuario_id INTEGER,
--   accion VARCHAR(100),
--   entidad VARCHAR(50),
--   entidad_id INTEGER,
--   detalles JSONB,
--   creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 7. Verificación final: listar tablas y columnas clave
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('usuarios', 'empresas', 'clientes')
-- ORDER BY table_name, ordinal_position;