import express from 'express';
import cors from 'cors';
import pool from './db';

const app = express();

app.use(cors());
app.use(express.json());

// ===================================================
// ADMIN - EMPRESAS (RUTAS DEFINITIVAS)
// ===================================================

// LISTAR EMPRESAS
app.get('/api/admin/empresas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre_legal, rfc, tipo_entidad, estado
      FROM empresas
      ORDER BY nombre_legal
    `);

    res.json({ empresas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

// OBTENER EMPRESA POR ID
app.get('/api/admin/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        nombre_legal,
        rfc,
        tipo_entidad,
        pais,
        domicilio,
        estado
      FROM empresas
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ empresa: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

// CREAR EMPRESA
app.post('/api/admin/empresas', async (req, res) => {
  try {
    const { nombre_legal, rfc, tipo_entidad, pais, domicilio } = req.body;

    if (!nombre_legal || !tipo_entidad || !pais || !domicilio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await pool.query(
      `
      INSERT INTO empresas
        (nombre_legal, rfc, tipo_entidad, pais, domicilio)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [nombre_legal, rfc, tipo_entidad, pais, domicilio]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

// EDITAR EMPRESA
app.put('/api/admin/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_legal, rfc, tipo_entidad, pais, domicilio, estado } = req.body;

    if (!nombre_legal || !tipo_entidad || !pais || !domicilio || !estado) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        nombre_legal = $1,
        rfc = $2,
        tipo_entidad = $3,
        pais = $4,
        domicilio = $5,
        estado = $6,
        actualizado_en = NOW()
      WHERE id = $7
      `,
      [nombre_legal, rfc, tipo_entidad, pais, domicilio, estado, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});



    const result = await pool.query(
      `
      INSERT INTO empresas
        (nombre_legal, rfc, tipo_entidad, pais, domicilio)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [nombre_legal, rfc, tipo_entidad, pais, domicilio]
    );

    return res.status(201).json({
      success: true,
      id: result.rows[0].id
    });
  } catch (err: any) {
    console.error('Error creando empresa:', err);
    return res.status(500).json({
      error: 'Error al crear la empresa'
    });
  }
});


// ===============================
// HEALTH CHECK
// ===============================
app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

// ===============================
// LOGIN DIRECTO (MODO ESTABILIZACIÓN)
// ===============================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }

    const result = await pool.query(
      `
      SELECT id, email, rol, empresa_id, nombre_completo
      FROM usuarios
      WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      token: 'dev-token',
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

export default app;
