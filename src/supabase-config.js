/* Configuración de Supabase.
   OJO: estos valores SON públicos por diseño (van en el frontend). La seguridad
   real la dan las reglas RLS de la base (ver supabase/schema.sql), no esconderlos. */
window.SUPABASE_CONFIG = {
  url: 'https://xxtassbprolppqcejxml.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGFzc2Jwcm9scHBxY2VqeG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDE2NTAsImV4cCI6MjA5NzU3NzY1MH0.4YFVVs5oYeTvXlIcQXotPoLTHpVaaTnKL0VItdMne8o',
};
