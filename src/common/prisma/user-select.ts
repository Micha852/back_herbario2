/**
 * Campos de usuario que se pueden incluir en respuestas públicas
 * (recolectores, autores de comentarios, createdBy/updatedBy...).
 * Nunca usar `user: true` en un include: expone el hash de la contraseña.
 */
export const publicUserSelect = {
  id: true,
  name: true,
} as const;
