/* ============================================================
   e-Onyx · Configuración de autenticación (Supabase)
   La "anon public key" es PÚBLICA por diseño: puede estar en el
   front-end. Lo que protege los datos son las políticas RLS de
   Supabase (ver /supabase/setup.sql), nunca la clave anon.
   NUNCA pongas aquí la "service_role key".
   ============================================================ */
window.EONYX_AUTH = {
  SUPABASE_URL: 'https://ucaecxnytxyxjoxtnyxj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYWVjeG55dHh5eGpveHRueXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDI2MDYsImV4cCI6MjEwODI3ODYwNn0.MeTYHXa_EHHrywXKTdEvsfoADEiZGETMYPwfOGhFCSI',
  AVATAR_BUCKET: 'avatars',
  SUPABASE_JS: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',

  /* Servicios protegidos con login. path = carpeta relativa a la raíz del sitio */
  SERVICES: {
    vitaris:  { name: 'Vitaris',  path: 'Vitaris/',  accent: '#0ea5e9' },
    codx:     { name: 'CodX',     path: 'CodX/',     accent: '#8b5cf6' },
    lingram:  { name: 'Lingram',  path: 'Lingram/',  accent: '#14b8a6' },
    sonorix:  { name: 'Sonorix',  path: 'Sonorix/',  accent: '#ec4899' },
    kinetiq:  { name: 'Kinetiq',  path: 'Kinetiq/',  accent: '#6366f1' }
  }
};
