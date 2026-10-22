// js/api.js · Todo lo que habla con la API vive aquí. Ni una línea de DOM.
// Reemplaza a datos.js: los personajes ya no están escritos a mano, se le piden a la red.

// Primera página de personajes. Ábrela en el navegador: { info: { count, pages, next, prev }, results: [20] }
export const URL_PERSONAJES = 'https://rickandmortyapi.com/api/character';

// Pide una URL y devuelve el JSON ya convertido en objetos de JavaScript.
// Hay DOS await porque son dos esperas distintas:
export const pedirJSON = async (url) => {
  const respuesta = await fetch(url);    // 1.ª: que el servidor conteste. Llega un Response (status, ok, headers), no los datos

  // fetch solo falla si NO pudo hablar con el servidor (sin red, dominio mal escrito).
  // Un 404 o un 500 llegan como respuesta "exitosa" con ok = false: el error lo lanzamos nosotros.
  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();  // 2.ª: que termine de llegar el cuerpo y se convierta de texto JSON a objetos
  return datos;
};

// Una función por cada cosa que le pedimos a la API. Hoy es un simple pasamanos,
// pero si mañana cambia la API (o tu API necesita más pasos), solo se toca este archivo.
export const obtenerPersonajes = (url) => pedirJSON(url);