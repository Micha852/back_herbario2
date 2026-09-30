/**
 * Escapa texto para insertarlo en HTML (correos, plantillas).
 * Usar SIEMPRE con datos que vienen del usuario: nombres, correos, mensajes...
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
