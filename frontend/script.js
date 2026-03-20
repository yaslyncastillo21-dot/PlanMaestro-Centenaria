document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:3000/api";

  const state = {
    cursos: [],
    estudiantes: [],
    metodosPago: [],
    pendientes: [],
  };

  const $ = (id) => document.getElementById(id);

  function setSection(id) {
    document.querySelectorAll("section").forEach((sec) => {
      sec.style.display = sec.id === id ? "block" : "none";
    });
  }

  function setStatus(id, message, type = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = `status ${type}`.trim();
  }

  function formatCedula(value) {
    let clean = value.replace(/\D/g, "").substring(0, 11);
    if (clean.length > 7) return clean.replace(/^(\d{3})(\d{7})(\d{1}).*/, "$1-$2-$3");
    if (clean.length > 3) return clean.replace(/^(\d{3})(\d+)/, "$1-$2");
    return clean;
  }

  function formatTelefono(value) {
    const clean = value.replace(/\D/g, "").substring(0, 10);
    if (clean.length > 6) return clean.replace(/^(\d{3})(\d{3})(\d+).*/, "$1-$2-$3");
    if (clean.length > 3) return clean.replace(/^(\d{3})(\d+)/, "$1-$2");
    return clean;
  }

  function updateCounter() {
    $("contador").textContent = $("comentarios").value.length;
  }

  function money(num) {
    return Number(num || 0).toFixed(2);
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...options,
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_error) {
        data = {};
      }

      if (!response.ok) {
        const detail = data.error || raw || `HTTP ${response.status}`;
        throw new Error(detail);
      }

      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("La API no respondio a tiempo. Verifique backend y base de datos.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function fillCursos() {
    const curso = $("curso");
    const cursoPago = $("cursoPago");
    [curso, cursoPago].forEach((select) => {
      while (select.options.length > 1) select.remove(1);
    });

    state.cursos.forEach((c) => {
      const label = `${c.nombre} - RD$${money(c.precio)}`;
      const opt1 = document.createElement("option");
      opt1.value = String(c.id);
      opt1.textContent = label;
      curso.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = String(c.id);
      opt2.textContent = c.nombre;
      cursoPago.appendChild(opt2);
    });
  }

  function fillEstudiantes() {
    const estudianteInscripcion = $("estudianteInscripcion");
    const estudiantePago = $("estudiantePago");
    [estudianteInscripcion, estudiantePago].forEach((select) => {
      while (select.options.length > 1) select.remove(1);
    });

    state.estudiantes.forEach((e) => {
      const label = `${e.nombre_apellido} (${e.cedula})`;
      const opt1 = document.createElement("option");
      opt1.value = String(e.id);
      opt1.textContent = label;
      estudianteInscripcion.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = String(e.id);
      opt2.textContent = label;
      estudiantePago.appendChild(opt2);
    });
  }

  function fillMetodosPago() {
    const metodoPago = $("metodoPago");
    while (metodoPago.options.length > 1) metodoPago.remove(1);
    state.metodosPago.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = String(m.id);
      opt.textContent = m.nombre;
      metodoPago.appendChild(opt);
    });
  }

  function renderPagos(rows) {
    const tbody = $("tablaPagos");
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.estudiante}</td>
        <td>${r.curso}</td>
        <td>${money(r.monto)}</td>
        <td>${String(r.fecha_pago).slice(0, 10)}</td>
        <td>${r.metodo}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderPendientes(rows) {
    const tbody = $("tablaPendientes");
    tbody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td colspan=\"6\">Sin datos</td>";
      tbody.appendChild(tr);
      return;
    }
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.estudiante}</td>
        <td>${r.curso}</td>
        <td>${money(r.total_curso)}</td>
        <td>${money(r.pagado)}</td>
        <td>${money(r.pendiente)}</td>
        <td>${r.estado}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function aplicarFiltrosPendientes() {
    const fEstudiante = $("filtroEstudiante").value.trim().toLowerCase();
    const fCurso = $("filtroCurso").value.trim().toLowerCase();
    const fEstado = $("filtroEstado").value.trim().toLowerCase();

    const filtrados = state.pendientes.filter((r) => {
      const okEstudiante = !fEstudiante || String(r.estudiante).toLowerCase().includes(fEstudiante);
      const okCurso = !fCurso || String(r.curso).toLowerCase().includes(fCurso);
      const okEstado = !fEstado || String(r.estado).toLowerCase() === fEstado;
      return okEstudiante && okCurso && okEstado;
    });

    renderPendientes(filtrados);
  }

  function calcularTotal() {
    const cursoId = Number($("curso").value || 0);
    const tipoPago = $("tipoPago").value;
    const inputMonto = $("montoPagado");
    const curso = state.cursos.find((c) => c.id === cursoId);

    if (!curso) {
      $("total").textContent = "0";
      $("pendiente").textContent = "0";
      inputMonto.disabled = true;
      return;
    }

    inputMonto.disabled = false;
    let total = Number(curso.precio);

    if (tipoPago === "completo") {
      total = total - total * Number(curso.descuento || 0);
      inputMonto.value = money(total);
      inputMonto.disabled = true;
    } else if (tipoPago === "becado") {
      total = 0;
      inputMonto.value = "0";
      inputMonto.disabled = true;
    }

    const pagado = Number($("montoPagado").value || 0);
    const pendiente = Math.max(0, total - pagado);
    $("total").textContent = money(total);
    $("pendiente").textContent = money(pendiente);
  }

  async function cargarCatalogos() {
    const [cursos, estudiantes, metodosPago] = await Promise.all([
      api("/cursos"),
      api("/estudiantes"),
      api("/metodos-pago"),
    ]);
    state.cursos = cursos;
    state.estudiantes = estudiantes;
    state.metodosPago = metodosPago;
    fillCursos();
    fillEstudiantes();
    fillMetodosPago();
    calcularTotal();
  }

  async function cargarTablas() {
    const [pagos, pendientes] = await Promise.all([api("/pagos"), api("/pendientes")]);
    renderPagos(pagos);
    state.pendientes = pendientes;
    aplicarFiltrosPendientes();
  }

  async function guardarEstudiante(event) {
    event.preventDefault();
    setStatus("estadoEstudiante", "Guardando...", "");
    const body = {
      nombre_apellido: $("nombreApellido").value.trim(),
      cedula: $("cedula").value.trim(),
      fecha_nacimiento: $("fechaNacimiento").value,
      telefono: $("telefono").value.trim(),
      correo: $("correo").value.trim(),
      comentarios: $("comentarios").value.trim() || null,
    };

    await api("/estudiantes", { method: "POST", body: JSON.stringify(body) });
    event.target.reset();
    updateCounter();
    await cargarCatalogos();
    setStatus("estadoEstudiante", "Estudiante guardado correctamente.", "ok");
  }

  async function guardarInscripcion(event) {
    event.preventDefault();
    setStatus("estadoInscripcion", "Guardando...", "");
    const montoInicial = Number($("montoPagado").value || 0);
    const body = {
      estudiante_id: Number($("estudianteInscripcion").value),
      curso_id: Number($("curso").value),
      tipo_pago: $("tipoPago").value,
      monto_inicial: montoInicial,
    };

    await api("/inscripciones", { method: "POST", body: JSON.stringify(body) });
    event.target.reset();
    $("total").textContent = "0";
    $("pendiente").textContent = "0";
    await cargarTablas();
    if (montoInicial > 0) {
      setStatus(
        "estadoInscripcion",
        "Inscripcion guardada. El abono inicial se registro automaticamente en Pagos.",
        "ok"
      );
    } else {
      setStatus("estadoInscripcion", "Inscripcion guardada correctamente.", "ok");
    }
  }

  async function guardarPago(event) {
    event.preventDefault();
    setStatus("estadoPago", "Guardando...", "");
    const estudianteId = Number($("estudiantePago").value);
    const cursoId = Number($("cursoPago").value);
    const lookup = await api(
      `/inscripciones/lookup?estudiante_id=${estudianteId}&curso_id=${cursoId}`
    );

    const body = {
      inscripcion_id: lookup.inscripcion_id,
      monto: Number($("montoPago").value),
      fecha_pago: $("fechaPago").value,
      metodo_pago_id: Number($("metodoPago").value),
    };

    await api("/pagos", { method: "POST", body: JSON.stringify(body) });
    event.target.reset();
    $("fechaPago").value = new Date().toISOString().slice(0, 10);
    await cargarTablas();
    setStatus("estadoPago", "Pago guardado correctamente.", "ok");
  }

  document.querySelectorAll("nav button[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => setSection(btn.dataset.section));
  });
  $("cedula").addEventListener("input", (e) => {
    e.target.value = formatCedula(e.target.value);
  });
  $("telefono").addEventListener("input", (e) => {
    e.target.value = formatTelefono(e.target.value);
  });
  $("comentarios").addEventListener("input", updateCounter);
  $("curso").addEventListener("change", calcularTotal);
  $("tipoPago").addEventListener("change", calcularTotal);
  $("montoPagado").addEventListener("input", calcularTotal);

  $("formEstudiante").addEventListener("submit", async (e) => {
    try {
      await guardarEstudiante(e);
    } catch (error) {
      setStatus("estadoEstudiante", error.message, "error");
    }
  });
  $("formInscripcion").addEventListener("submit", async (e) => {
    try {
      await guardarInscripcion(e);
    } catch (error) {
      setStatus("estadoInscripcion", error.message, "error");
    }
  });
  $("formPago").addEventListener("submit", async (e) => {
    try {
      await guardarPago(e);
    } catch (error) {
      setStatus("estadoPago", error.message, "error");
    }
  });
  $("filtroEstudiante").addEventListener("input", aplicarFiltrosPendientes);
  $("filtroCurso").addEventListener("input", aplicarFiltrosPendientes);
  $("filtroEstado").addEventListener("change", aplicarFiltrosPendientes);
  $("btnLimpiarFiltros").addEventListener("click", () => {
    $("filtroEstudiante").value = "";
    $("filtroCurso").value = "";
    $("filtroEstado").value = "";
    aplicarFiltrosPendientes();
  });

  setSection("estudiantes");
  $("fechaPago").value = new Date().toISOString().slice(0, 10);
  cargarCatalogos()
    .then(cargarTablas)
    .catch((error) => {
      setStatus("estadoEstudiante", `No se pudo cargar catalogos: ${error.message}`, "error");
    });
});
