import { DateRangeFilter, PeriodType } from '../types';

export class DateRangeService {
  /**
   * Convierte un tipo de período en filtros de fecha con comparación
   * @param periodType - Tipo de período seleccionado
   * @returns Objeto con rangos de fecha actuales y anteriores
   */
  public static getPeriodRanges(periodType: PeriodType): DateRangeFilter {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (periodType.type) {
      case 'hoy':
        // Obtener fecha actual en timezone local (interpretado por PostgreSQL según su configuración)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = today;
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;

      case 'ultimos_7_dias':
        // Calcular en timezone local
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        break;

      case 'ultimos_30_dias':
        // Calcular en timezone local
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        break;

      case 'ultimo_ano':
        // Calcular en timezone local
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;

      case 'personalizado':
        if (!periodType.startDate || !periodType.endDate) {
          throw new Error('Fechas de inicio y fin son requeridas para período personalizado');
        }
        // Crear fechas desde strings "YYYY-MM-DD" en timezone local
        // El frontend envía fechas sin timezone, las interpretamos como locales
        const [startYear, startMonth, startDay] = periodType.startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = periodType.endDate.split('-').map(Number);
        
        startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        break;

      default:
        throw new Error(`Tipo de período no válido: ${periodType.type}`);
    }

    // Calcular el período anterior (mismo rango de días hacia atrás)
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1); // Un milisegundo antes del período actual
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    };
  }

  /**
   * Valida que las fechas personalizadas sean válidas
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns true si las fechas son válidas
   */
  public static validateCustomDates(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    return start <= end;
  }

  /**
   * Calcula la diferencia en días entre dos fechas
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Número de días de diferencia
   */
  public static getDaysDifference(startDate: Date, endDate: Date): number {
    const timeDifference = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
  }
}
