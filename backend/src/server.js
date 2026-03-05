require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { getPool, sql } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await getPool();
    res.json({ ok: true, message: "Conexion a SQL Server OK" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/estudiantes", async (req, res) => {
  const {
    nombre_apellido,
    cedula,
    fecha_nacimiento,
    telefono,
    correo,
    comentarios = null,
  } = req.body;

  if (!nombre_apellido || !cedula || !fecha_nacimiento || !telefono || !correo) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("nombre_apellido", sql.NVarChar(150), nombre_apellido)
      .input("cedula", sql.VarChar(13), cedula)
      .input("fecha_nacimiento", sql.Date, fecha_nacimiento)
      .input("telefono", sql.VarChar(20), telefono)
      .input("correo", sql.NVarChar(150), correo)
      .input("comentarios", sql.NVarChar(300), comentarios)
      .query(`
        INSERT INTO dbo.estudiantes (
          nombre_apellido, cedula, fecha_nacimiento, telefono, correo, comentarios
        )
        OUTPUT INSERTED.id
        VALUES (
          @nombre_apellido, @cedula, @fecha_nacimiento, @telefono, @correo, @comentarios
        );
      `);

    res.status(201).json({ ok: true, id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/estudiantes", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, nombre_apellido, cedula, correo
      FROM dbo.estudiantes
      ORDER BY nombre_apellido;
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/inscripciones", async (req, res) => {
  const { estudiante_id, curso_id, tipo_pago, monto_inicial = 0 } = req.body;

  if (!estudiante_id || !curso_id || !tipo_pago) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
  }

  try {
    const pool = await getPool();

    const curso = await pool
      .request()
      .input("curso_id", sql.Int, curso_id)
      .query("SELECT precio, descuento FROM dbo.cursos WHERE id = @curso_id;");

    if (!curso.recordset.length) {
      return res.status(404).json({ ok: false, error: "Curso no encontrado" });
    }

    const { precio, descuento } = curso.recordset[0];
    const descuentoAplicado = tipo_pago === "completo" ? descuento : 0;

    const result = await pool
      .request()
      .input("estudiante_id", sql.Int, estudiante_id)
      .input("curso_id", sql.Int, curso_id)
      .input("tipo_pago", sql.VarChar(20), tipo_pago)
      .input("total_curso", sql.Decimal(12, 2), precio)
      .input("descuento_aplicado", sql.Decimal(5, 4), descuentoAplicado)
      .input("monto_inicial", sql.Decimal(12, 2), monto_inicial)
      .query(`
        INSERT INTO dbo.inscripciones (
          estudiante_id, curso_id, tipo_pago, total_curso, descuento_aplicado, monto_inicial
        )
        OUTPUT INSERTED.id
        VALUES (
          @estudiante_id, @curso_id, @tipo_pago, @total_curso, @descuento_aplicado, @monto_inicial
        );
      `);

    res.status(201).json({ ok: true, id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/inscripciones/lookup", async (req, res) => {
  const estudianteId = Number(req.query.estudiante_id);
  const cursoId = Number(req.query.curso_id);

  if (!estudianteId || !cursoId) {
    return res.status(400).json({ ok: false, error: "estudiante_id y curso_id son requeridos" });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("estudiante_id", sql.Int, estudianteId)
      .input("curso_id", sql.Int, cursoId)
      .query(`
        SELECT TOP 1 id
        FROM dbo.inscripciones
        WHERE estudiante_id = @estudiante_id
          AND curso_id = @curso_id
          AND estado <> 'anulado'
        ORDER BY created_at DESC;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ ok: false, error: "No hay inscripcion para ese estudiante y curso" });
    }

    res.json({ inscripcion_id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/pagos", async (req, res) => {
  const { inscripcion_id, monto, fecha_pago, metodo_pago_id, referencia = null, observaciones = null } =
    req.body;

  if (!inscripcion_id || !monto || !fecha_pago || !metodo_pago_id) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("inscripcion_id", sql.Int, inscripcion_id)
      .input("monto", sql.Decimal(12, 2), monto)
      .input("fecha_pago", sql.Date, fecha_pago)
      .input("metodo_pago_id", sql.Int, metodo_pago_id)
      .input("referencia", sql.NVarChar(100), referencia)
      .input("observaciones", sql.NVarChar(300), observaciones)
      .execute("dbo.sp_registrar_pago");

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/pagos", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 50
        e.nombre_apellido AS estudiante,
        c.nombre AS curso,
        p.monto,
        p.fecha_pago,
        mp.nombre AS metodo
      FROM dbo.pagos p
      INNER JOIN dbo.inscripciones i ON i.id = p.inscripcion_id
      INNER JOIN dbo.estudiantes e ON e.id = i.estudiante_id
      INNER JOIN dbo.cursos c ON c.id = i.curso_id
      INNER JOIN dbo.metodos_pago mp ON mp.id = p.metodo_pago_id
      ORDER BY p.fecha_pago DESC, p.id DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/metodos-pago", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, nombre
      FROM dbo.metodos_pago
      WHERE activo = 1
      ORDER BY nombre;
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/cursos", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT id, nombre, precio, descuento FROM dbo.cursos WHERE activo = 1 ORDER BY nombre;");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/pendientes", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        estudiante,
        curso,
        total_final AS total_curso,
        monto_pagado_acumulado AS pagado,
        monto_pendiente AS pendiente,
        estado
      FROM dbo.vw_estado_cuenta
      ORDER BY fecha_inscripcion DESC, inscripcion_id DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
