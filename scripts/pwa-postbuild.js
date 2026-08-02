// Post-procesa el export web de Expo (carpeta dist/) para que la app se pueda
// "Añadir a pantalla de inicio" en iOS/Android como una PWA a pantalla completa.
// Inyecta los meta de Apple/PWA en index.html, genera el manifest y copia el icono.
// Se ejecuta después de `expo export --platform web` (ver package.json / vercel.json).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');

const THEME_COLOR = '#16A34A'; // verde de marca (src/theme)
const BG_COLOR = '#F7F8F6';
const APP_NAME = 'Recetas del Ticket';
const SHORT_NAME = 'Recetas';

if (!fs.existsSync(INDEX)) {
  console.error(`[pwa-postbuild] No se encontró ${INDEX}. ¿Se ejecutó "expo export --platform web" antes?`);
  process.exit(1);
}

// 1) Copiar el icono de la app al dist para usarlo como apple-touch-icon y en el manifest.
const iconSrc = path.join(ROOT, 'assets', 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(DIST, 'icon.png'));
  fs.copyFileSync(iconSrc, path.join(DIST, 'apple-touch-icon.png'));
} else {
  console.warn('[pwa-postbuild] assets/icon.png no existe; se omite el icono.');
}

// 2) Generar el manifest de la PWA.
const manifest = {
  name: APP_NAME,
  short_name: SHORT_NAME,
  description: 'Convierte el ticket de la compra en planes de comidas semanales.',
  lang: 'es',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: BG_COLOR,
  theme_color: THEME_COLOR,
  icons: [
    { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// 3) Inyectar los meta de PWA en index.html (idempotente).
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace('<html lang="en">', '<html lang="es">');

if (!html.includes('name="apple-mobile-web-app-capable"')) {
  const tags = [
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    `<meta name="apple-mobile-web-app-title" content="${SHORT_NAME}" />`,
    `<meta name="application-name" content="${SHORT_NAME}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    '<meta name="format-detection" content="telephone=no" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
  ].map((t) => '    ' + t).join('\n');
  html = html.replace('</head>', tags + '\n  </head>');
}

fs.writeFileSync(INDEX, html);
console.log('[pwa-postbuild] index.html + manifest.webmanifest + iconos listos en dist/.');
