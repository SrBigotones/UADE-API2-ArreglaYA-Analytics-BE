/**
 * Utilidades para manejo de fechas
 * 
 * IMPORTANTE: Estas funciones trabajan con timezone local (America/Argentina/Buenos_Aires)
 * configurado en PostgreSQL y en DateRangeService.
 */

/**
 * Formatea una fecha como YYYY-MM-DD en timezone local
 * (sin conversión a UTC como hace toISOString())
 * 
 * @param date Fecha a formatear
 * @returns String en formato YYYY-MM-DD usando timezone local
 * 
 * @example
 * // date = new Date(2025, 10, 25, 23, 30, 0) // 25 Nov 2025, 23:30 Argentina
 * formatDateLocal(date) // "2025-11-25" ✅ (correcto, no cambia al día siguiente)
 * date.toISOString().split('T')[0] // "2025-11-26" ❌ (incorrecto, convierte a UTC)
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha como YYYY-MM-DD HH:mm:ss en timezone local
 * 
 * @param date Fecha a formatear
 * @returns String en formato YYYY-MM-DD HH:mm:ss usando timezone local
 */
export function formatDateTimeLocal(date: Date): string {
  const datePart = formatDateLocal(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}

