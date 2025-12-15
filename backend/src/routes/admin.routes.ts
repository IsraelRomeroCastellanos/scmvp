// backend/src/routes/admin.routes.ts
// LISTAR empresas
router.get('/empresas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre_legal, rfc, tipo_entidad, estado, domicilio
      FROM empresas
      ORDER BY nombre_legal
    `);

    const empresas = result.rows.map((e) => {
      let entidad = null;
      let municipio = null;
      let codigo_postal = null;

      if (e.domicilio) {
        const parts = e.domicilio.split(',').map((p: string) => p.trim());
        municipio = parts[1] || null;
        entidad = parts[2] || null;

        const cpMatch = e.domicilio.match(/CP\s*(\d{4,6})/i);
        if (cpMatch) codigo_postal = cpMatch[1];
      }

      return {
        id: e.id,
        nombre_legal: e.nombre_legal,
        rfc: e.rfc,
        tipo_entidad: e.tipo_entidad,
        estado: e.estado,
        entidad,
        municipio,
        codigo_postal
      };
    });

    res.json({ empresas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

// CREAR empresa
router.post('/empresas', async (req, res) => {
  // ...
});

// OBTENER empresa por ID
router.get('/empresas/:id', async (req, res) => {
  // ...
});

// EDITAR empresa
router.put('/empresas/:id', async (req, res) => {
  // ...
});
