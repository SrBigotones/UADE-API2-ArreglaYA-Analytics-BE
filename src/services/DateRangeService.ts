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
        // Obtener fecha actual en UTC
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        startDate = todayUTC;
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;

      case 'ultimos_7_dias':
        // Calcular en UTC
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
        break;

      case 'ultimos_30_dias':
        // Calcular en UTC
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0));
        break;

      case 'ultimo_ano':
        // Calcular en UTC
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        startDate = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        break;

      case 'personalizado':
        if (!periodType.startDate || !periodType.endDate) {
          throw new Error('Fechas de inicio y fin son requeridas para período personalizado');
        }
        // Crear fechas en UTC: la fecha que viene es "YYYY-MM-DD"
        // Queremos desde las 00:00:00.000 UTC hasta las 23:59:59.999 UTC de esas fechas
        startDate = new Date(periodType.startDate + 'T00:00:00.000Z');
        endDate = new Date(periodType.endDate + 'T23:59:59.999Z');
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
