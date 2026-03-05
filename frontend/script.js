document.addEventListener("DOMContentLoaded", function () {

   function mostrarSeccion(id) {
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");
    document.getElementById(id).style.display = "block";
}

/* CONTADOR DE CARACTERES */
function actualizarContador() {
    const texto = document.getElementById("comentarios").value.length;
    document.getElementById("contador").innerText = texto;
}

/* CURSOS */
const cursos = {
    "CCNA v7 Módulo 1": { precio: 13200, descuento: 0.25 },
    "Manejo Apple Mac": { precio: 8900, descuento: 0.20 },
    "Ciberseguridad (CISCO)": { precio: 11700, descuento: 0.20 },
    "Diplomado IoT (Virtual)": { precio: 7800, descuento: 0.20 },
    "Prog. Apps iOS & Android": { precio: 8700, descuento: 0.20 },
    "Diseño Gráfico Full": { precio: 15600, descuento: 0.36 },
    "Diseño Gráfico Básico": { precio: 11700, descuento: 0.20 },
    "Paquete de Oficina": { precio: 11700, descuento: 0.20 },
    "Excel Avanzado": { precio: 9700, descuento: 0.20 },
    "Tecnólogo en Informática": { precio: 6500, descuento: 0 },
    "Reparación de PC": { precio: 7800, descuento: 0.20 },
    "Diplomado Contabilidad": { precio: 11600, descuento: 0.15 },
    "Marketing Digital": { precio: 4900, descuento: 0 },
    "Redes Sociales": { precio: 3800, descuento: 0 }
};

/* Cargar cursos */
/* Cargar cursos en ambos selects */
const selectCursoInscripcion = document.getElementById("curso");
const selectCursoPago = document.getElementById("cursoPago");

for (let nombre in cursos) {

    // Inscripción
    let option1 = document.createElement("option");
    option1.value = nombre;
    option1.textContent = nombre;
    selectCursoInscripcion.appendChild(option1);

    // Pagos
    let option2 = document.createElement("option");
    option2.value = nombre;
    option2.textContent = nombre;
    selectCursoPago.appendChild(option2);
}

function actualizarInfoCurso() {
    document.getElementById("montoPagado").value = "";
    document.getElementById("tipoPago").value = "cuotas";
    document.getElementById("total").innerText = "0";
    document.getElementById("pendiente").innerText = "0";
    calcularTotal();
}

function calcularTotal() {

    const cursoSeleccionado = document.getElementById("curso").value;
    const tipoPago = document.getElementById("tipoPago").value;
    const inputMonto = document.getElementById("montoPagado");

    if (!cursoSeleccionado) {
        document.getElementById("total").innerText = "0";
        document.getElementById("pendiente").innerText = "0";
        inputMonto.disabled = true;
        return;
    }

    const info = cursos[cursoSeleccionado];
    const montoPagado = parseFloat(inputMonto.value) || 0;

    let total = info.precio;
    let pendiente = 0;

    if (tipoPago === "completo") {
        total = total - (total * info.descuento);
        pendiente = 0;
        inputMonto.disabled = true;  
        inputMonto.value = total;     //coloca automáticamente el total
    }
    else if (tipoPago === "becado") {
        total = 0;
        pendiente = 0;
        inputMonto.disabled = true;   
        inputMonto.value = 0;
    }
    else { // cuotas
        inputMonto.disabled = false;  
        pendiente = total - montoPagado;
        if (pendiente < 0) pendiente = 0;
    }

    document.getElementById("total").innerText = total;
    document.getElementById("pendiente").innerText = pendiente;
}


function formatearCedula(input) {
    let valor = input.value.replace(/\D/g, "");
    valor = valor.substring(0, 11);

    if (valor.length > 7) {
        valor = valor.replace(/^(\d{3})(\d{7})(\d{1}).*/, "$1-$2-$3");
    } else if (valor.length > 3) {
        valor = valor.replace(/^(\d{3})(\d+)/, "$1-$2");
    }

    input.value = valor;
}

function guardarPago(event) {
    event.preventDefault();

    const estudiante = document.getElementById("estudiantePago").value;
    const curso = document.getElementById("cursoPago").value;
    const monto = document.getElementById("montoPago").value;
    const fecha = document.getElementById("fechaPago").value;
    const metodo = document.getElementById("metodoPago").value;

    if (!estudiante || !curso || !monto || !fecha || !metodo) {
        alert("Complete todos los campos");
        return;
    }

    const tabla = document.getElementById("tablaPagos");

    const fila = document.createElement("tr");

    fila.innerHTML = `
        <td>${estudiante}</td>
        <td>${curso}</td>
        <td>${monto}</td>
        <td>${fecha}</td>
        <td>${metodo}</td>
    `;

    tabla.appendChild(fila);

    // Limpiar formulario
    document.getElementById("estudiantePago").value = "";
    document.getElementById("cursoPago").value = "";
    document.getElementById("montoPago").value = "";
    document.getElementById("fechaPago").value = "";
    document.getElementById("metodoPago").selectedIndex = 0;
}

});
