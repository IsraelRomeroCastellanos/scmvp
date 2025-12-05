-- =============================================
-- PLATAFORMA DE CUMPLIMIENTO - Estructura MVP
-- Compatible con PostgreSQL en Render
-- =============================================

-- 1. Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hash
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'consultor', 'cliente')),
    empresa_id INTEGER, -- NULL para admin y consultor; obligatorio para cliente
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por rol y empresa
CREATE INDEX idx_usuarios_rol_empresa ON usuarios(rol, empresa_id);

-- 2. Tabla de empresas
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nombre_legal VARCHAR(255) NOT NULL,
    rfc VARCHAR(20), -- opcional para personas físicas
    tipo_entidad VARCHAR(20) NOT NULL CHECK (tipo_entidad IN ('persona_fisica', 'persona_moral')),
    pais VARCHAR(100) DEFAULT 'México',
    domicilio TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de clientes (personas físicas o morales asociadas a una empresa)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id_externo VARCHAR(100), -- ID proporcionado por la empresa (opcional)
    nombre_entidad VARCHAR(255) NOT NULL, -- Nombre o razón social
    alias VARCHAR(255),
    fecha_nacimiento_constitucion DATE,
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('persona_fisica', 'persona_moral')),
    nacionalidad VARCHAR(100),
    domicilio_mexico TEXT,
    ocupacion VARCHAR(255),
    actividad_economica VARCHAR(255), -- Para matriz de riesgo
    datos_completos JSONB, -- Almacena formulario dinámico (KYC)
    porcentaje_cumplimiento INTEGER DEFAULT 0 CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por empresa
CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);

-- 4. Tabla de transacciones (alimentación mensual)
CREATE TABLE transacciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    monto DECIMAL(15,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    fecha_operacion DATE NOT NULL,
    tipo_operacion VARCHAR(100), -- Ej: "venta_inmueble", "servicio_profesional"
    datos_adicionales JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por cliente y fecha
CREATE CREATE INDEX idx_transacciones_cliente_fecha ON transacciones(cliente_id, fecha_operacion);

-- 5. Tabla de resultados de barrido de listas
CREATE TABLE barridos_listas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_lista VARCHAR(30) NOT NULL CHECK (tipo_lista IN ('ppe', 'sanciones', 'paises_riesgo')),
    coincidencia BOOLEAN NOT NULL DEFAULT false,
    detalles JSONB, -- Resultado del match (nombre, score, fuente, etc.)
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de matrices de riesgo
CREATE TABLE matrices_riesgo (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nivel_riesgo VARCHAR(10) NOT NULL CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
    puntaje_riesgo INTEGER NOT NULL,
    factores JSONB, -- Qué elementos contribuyeron al riesgo
    generado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de alertas
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_alerta VARCHAR(50) NOT NULL, -- Ej: "perfil_transaccional_anomalo", "umbral_superado"
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'resuelta', 'descartada')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resuelto_en TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- POLÍTICAS DE SEGURIDAD BÁSICAS (opcional en MVP, pero recomendadas)
-- =============================================

-- Nota: En Render Free, no se puede usar Row-Level Security (RLS) sin cuenta paga.
-- Pero puedes implementar el aislamiento en la lógica de la API (backend).

-- =============================================
-- DATOS DE PRUEBA (opcional)
-- =============================================

-- Empresa de prueba
INSERT INTO empresas (nombre_legal, tipo_entidad, rfc, domicilio)
VALUES ('Empresa de Prueba SA de CV', 'persona_moral', 'EMP010203ABC', 'Av. Reforma 123, CDMX');

-- Usuario cliente vinculado a la empresa
INSERT INTO usuarios (email, password_hash, nombre_completo, rol, empresa_id)
VALUES (
    'cliente@prueba.com',
    '$2b$10$abcdefghijklmnopqrstuv', -- hash falso (en realidad usa bcrypt)
    'Cliente de Prueba',
    'cliente',
    1
);

-- Cliente asociado a la empresa
INSERT INTO clientes (empresa_id, nombre_entidad, tipo_cliente, actividad_economica, porcentaje_cumplimiento)
VALUES (1, 'Juan Pérez', 'persona_fisica', 'venta_de_inmuebles', 100);
