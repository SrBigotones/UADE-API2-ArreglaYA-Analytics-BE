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
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;

      case 'ultimos_7_dias':
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6); // Los últimos 7 días incluyen hoy
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'ultimos_30_dias':
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29); // Los últimos 30 días incluyen hoy
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'ultimo_ano':
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'personalizado':
        if (!periodType.startDate || !periodType.endDate) {
          throw new Error('Fechas de inicio y fin son requeridas para período personalizado');
        }
        startDate = new Date(periodType.startDate);
        endDate = new Date(periodType.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
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
