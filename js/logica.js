// js/logica.js · Funciones PURAS: reciben datos y devuelven datos.
// Prueba de fuego: aquí no aparece la palabra document. Se podrían usar en un programa sin pantalla.

// Dos filter encadenados. El select usa 'alive' y la API 'Alive': comparamos en minúsculas.
export const filtrarPersonajes = (lista, { texto, estado }) => {
  const buscado = texto.trim().toLowerCase();
  return lista
    .filter((p) => p.name.toLowerCase().includes(buscado))
    .filter((p) => estado === '' || p.status.toLowerCase() === estado);
};

// reduce: recorre la lista llevando un acumulador (total) que empieza en 0
export const contarVivos = (lista) =>
  lista.reduce((total, p) => (p.status === 'Alive' ? total + 1 : total), 0);

// find: el PRIMER elemento que cumple, o undefined si ninguno
export const buscarPorId = (lista, id) => lista.find((p) => p.id === id);