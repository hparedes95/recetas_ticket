// Config dinámica de Expo.
// Permite fijar un "base URL" para publicar en GitHub Pages bajo una subruta
// (p. ej. /recetas_ticket) sin romper el build normal servido en la raíz.
// - En local / Vercel: APP_BASE_URL no está → baseUrl vacío → se sirve en "/".
// - En el workflow de GitHub Pages: APP_BASE_URL=/recetas_ticket.
// El resto de la config sigue viniendo de app.json (se recibe en `config`).
module.exports = ({ config }) => {
  const baseUrl = process.env.APP_BASE_URL || '';
  return {
    ...config,
    experiments: {
      ...(config.experiments || {}),
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
