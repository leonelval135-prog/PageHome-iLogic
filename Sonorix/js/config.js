/* Configuración de descarga y versiones */
const APK_URL = 'https://github.com/leonelval135-prog/PageHome-iLogic/releases/download/eMusic/eMusic_v1.0.apk';
const APK_FILE = 'Sonorix_v1.0.apk';

/* status: latest (descargable) · locked (bloqueada) · soon (próximamente) */
const VERSIONS = [
  { name:'Sonorix v1.0',   file:'Sonorix_v1.0.apk',   meta:'Android APK', icon:'package-check', status:'latest' },
  { name:'Sonorix v1.0.1', file:'Sonorix_v1.0.1.apk', meta:'Android APK', icon:'package',       status:'locked' },
  { name:'Sonorix v1.0.0', file:'Sonorix_v1.0.0.apk', meta:'Android APK', icon:'package',       status:'locked' },
  { name:'Sonorix para iOS', file:'', meta:'iPhone y iPad', icon:'apple', status:'soon' }
];
