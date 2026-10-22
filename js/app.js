// js/app.js · La interfaz: DOM y eventos. Importa lo que necesita de los otros dos módulos.
// Las rutas empiezan con ./ y terminan en .js: en el navegador las dos cosas son obligatorias.
// datos.js ya no existe: ahora los personajes los trae api.js desde la red.
import { URL_PERSONAJES, obtenerPersonajes } from './api.js';
import { filtrarPersonajes, contarVivos, buscarPorId } from './logica.js';

// ============ ESTADO ============
const filtros = { texto: '', estado: '' };
// Los personajes ahora son ESTADO que llega de la red. Empieza vacío, y es let (no const)
// porque cuando llegue la respuesta lo vamos a reemplazar por lo que mande la API.
let personajes = [];
let cargando = false;   // ¿hay una petición en camino?
let error = null;       // null = todo bien; si algo falla, aquí queda el mensaje
// La próxima página por pedir. Empieza en la primera; después la dice la API en info.next.
// Cuando info.next llega como null, ya no hay más páginas.
let siguiente = URL_PERSONAJES;

// ============ PRESENTACIÓN ============
// Cada status de la API → texto en español + clases COMPLETAS de Tailwind
// (nunca armadas por pedazos: Tailwind solo genera las clases que encuentra escritas enteras)
const ESTADOS = {
  Alive:   { texto: 'Vivo',        clases: 'bg-emerald-100 text-emerald-700' },
  Dead:    { texto: 'Muerto',      clases: 'bg-rose-100 text-rose-700' },
  unknown: { texto: 'Desconocido', clases: 'bg-slate-200 text-slate-600' },
};

// Recibe UN personaje y devuelve el HTML de SU tarjeta: es la tarjeta de la semana 6
// copiada tal cual, con ${…} en cada lugar donde antes iba un dato escrito a mano.
const tarjetaHTML = (p) => `
  <article class="flex flex-col overflow-hidden rounded-2xl bg-white shadow group transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800">
    <div class="overflow-hidden">
      <img src="${p.image}" alt="${p.name}"
           class="aspect-square w-full object-cover transition group-hover:scale-105">
    </div>
    <div class="flex flex-1 flex-col gap-2 p-4">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">${p.name}</h3>
      <span class="w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[p.status].clases}">● ${ESTADOS[p.status].texto}</span>
      <p class="text-sm text-slate-500 dark:text-slate-400">${p.species} · ${p.origin.name}</p>
      <button type="button" data-id="${p.id}"
              class="mt-auto rounded-lg bg-indigo-600 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        Ver detalle
      </button>
    </div>
  </article>`;

// ============ DOM ============
// --- Menú móvil: mostrar/ocultar y avisar al lector de pantalla ---
const btnMenu = document.getElementById('btn-menu');
const menu = document.getElementById('menu');

btnMenu.addEventListener('click', function () {
  menu.classList.toggle('hidden');                  // si tiene hidden se lo quita, si no se lo pone
  const abierto = !menu.classList.contains('hidden');
  btnMenu.setAttribute('aria-expanded', abierto);   // true / false
});

// --- Modal ---
const modal = document.getElementById('modal-detalle');

// Llena el modal con UN personaje y lo abre.
// Destructuring: saca siete propiedades del objeto a siete variables, en una sola línea.
const abrirDetalle = (personaje) => {
  const { name, image, status, species, type, origin, location } = personaje;
  document.getElementById('modal-nombre').textContent = name;
  document.getElementById('modal-img').src = image;
  document.getElementById('modal-img').alt = name;
  document.getElementById('modal-estado').textContent = ESTADOS[status].texto;
  document.getElementById('modal-especie').textContent = type ? `${species} (${type})` : species;
  document.getElementById('modal-origen').textContent = origin.name;
  document.getElementById('modal-ubicacion').textContent = location.name;
  modal.showModal();
};

// Clic en el fondo oscuro: el target es el propio <dialog>, no algo de adentro
modal.addEventListener('click', function (e) {
  if (e.target === modal) modal.close();
});

// --- Grilla ---
const grilla = document.querySelector('#grilla');
const contador = document.querySelector('#contador');
const btnMas = document.querySelector('#btn-mas');

// render: ESTADO → pantalla. Ya no recibe la lista: la calcula a partir de filtros.
// Regla del patrón: cuando algo cambia, se cambia el estado y se llama render(). Nada más.
const render = () => {
  // Botón "Cargar más": visible solo si hay tarjetas y la API dijo que hay otra página.
  // Mientras carga se desactiva (así nadie pide la misma página dos veces).
  btnMas.hidden = siguiente === null || personajes.length === 0;
  btnMas.disabled = cargando;
  btnMas.textContent = cargando ? 'Cargando…' : error ? 'No se pudo cargar. Reintentar' : 'Cargar más';

  // La grilla solo muestra "cargando" o "error" si todavía no hay NINGÚN personaje.
  // Si ya hay tarjetas, se quedan quietas y el aviso lo da el botón.
  // Estado 1 · CARGANDO: la petición salió y todavía no vuelve
  if (cargando && personajes.length === 0) {
    grilla.innerHTML = `<p class="col-span-full animate-pulse rounded-2xl bg-white p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-400">Cargando personajes…</p>`;
    contador.textContent = '';
    return;
  }
  // Estado 2 · ERROR: un mensaje amable y una salida (Reintentar). El detalle técnico, en pequeño.
  if (error && personajes.length === 0) {
    grilla.innerHTML = `
      <div class="col-span-full rounded-2xl bg-white p-8 text-center dark:bg-slate-800">
        <p class="font-semibold text-rose-600 dark:text-rose-400">No pudimos cargar los personajes.</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Revisa tu conexión e inténtalo de nuevo. (${error})</p>
        <button type="button" data-reintentar
                class="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          Reintentar
        </button>
      </div>`;
    contador.textContent = '';
    return;
  }
  // Estado 3 · VACÍO o ÉXITO: exactamente igual que en la semana 7
  const visibles = filtrarPersonajes(personajes, filtros);
  if (visibles.length === 0) {
    // Estado vacío: nunca dejes la pantalla en blanco sin explicar por qué
    grilla.innerHTML = `<p class="col-span-full rounded-2xl bg-white p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ningún personaje coincide con la búsqueda.</p>`;
  } else {
    grilla.innerHTML = visibles.map(tarjetaHTML).join('');
  }
  contador.textContent =
    `${visibles.length} de ${personajes.length} personajes · ${contarVivos(visibles)} vivos`;
};

// --- Buscador y filtro: cada evento cambia el ESTADO y llama a render() ---
const formBusqueda = document.querySelector('#form-busqueda');
const inputBusqueda = document.querySelector('#busqueda');
const selectEstado = document.querySelector('#filtro-estado');

// input se dispara con CADA tecla; evento.target es el campo y .value lo que tiene escrito
inputBusqueda.addEventListener('input', (evento) => {
  filtros.texto = evento.target.value;
  render();
});

// change se dispara cuando el select cambia de opción
selectEstado.addEventListener('change', (evento) => {
  filtros.estado = evento.target.value;
  render();
});

// Enter dentro del formulario lo envía y RECARGA la página: preventDefault lo impide
formBusqueda.addEventListener('submit', (evento) => evento.preventDefault());

// Delegación: UN listener en la grilla, que nunca se borra. Los botones se destruyen y se
// crean en cada render, pero su clic "burbujea" hasta la grilla y aquí lo atrapamos.
grilla.addEventListener('click', (evento) => {
  // ¿Clic en "Reintentar"? Ese botón también lo crea render(): la misma delegación lo atrapa
  if (evento.target.closest('[data-reintentar]')) {
    cargar();
    return;
  }
  const boton = evento.target.closest('[data-id]');  // ¿el clic fue en (o dentro de) un botón con data-id?
  if (!boton) return;                                // clic en otra parte de la grilla: nada que hacer
  const personaje = buscarPorId(personajes, Number(boton.dataset.id));
  abrirDetalle(personaje);
});

// "Cargar más" pide la página que diga siguiente. Es la MISMA función cargar()
btnMas.addEventListener('click', () => cargar());

// ============ CARGA ============
// async: dentro de esta función se puede usar await. Mientras espera a la red, la página
// sigue viva (prueba abrir el menú): await pausa ESTA función, no el navegador.
// Ahora con los tres estados. Siempre igual: cambiar el estado → render().
// Pide la página "siguiente": la primera vez es la 1, después la 2, la 3…
const cargar = async () => {
  cargando = true;                // 1. "estoy pidiendo"…
  error = null;
  render();                       //    …y se pinta YA, antes de esperar a la red
  try {
    const datos = await obtenerPersonajes(siguiente);
    // 2a. llegó bien. Spread: un array NUEVO con los que ya había + los 20 que llegaron
    personajes = [...personajes, ...datos.results];
    siguiente = datos.info.next;  //     la API nos dice cuál es la próxima página (o null)
  } catch (e) {
    // Aquí caen los dos tipos de error: sin red (fetch falla) y HTTP (el throw de pedirJSON)
    error = e.message;            // 2b. falló: guardamos el mensaje
    console.error(e);             //     y lo dejamos en la consola para quien programa
  }
  cargando = false;               // 3. bien o mal, ya no estamos cargando
  render();
};

cargar();