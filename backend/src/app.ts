import express from 'express';
import cors from 'cors';
import pool from './db';

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// 🔧 RUTA PUENTE TEMPORAL - EMPRESAS
// ===============================
app.get('/api/admin/empresas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre_legal,
        rfc,
        tipo_entidad,
        estado
      FROM empresas
      ORDER BY nombre_legal
    `);

    return res.status(200).json({
      empresas: result.rows
    });
  } catch (err) {
    console.error('Error puente empresas:', err);
    return res.status(500).json({
      error: 'Error al listar empresas'
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
