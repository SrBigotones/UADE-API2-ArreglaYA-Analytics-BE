import { DateRangeFilter, PeriodType } from '../types';

export class DateRangeService {
  /**
   * Convierte un tipo de período en filtros de fecha con comparación
   * @param periodType - Tipo de período seleccionado
   * @returns Objeto con rangos de fecha actuales y anteriores
   * 
   * IMPORTANTE: El servidor Lambda está en UTC, pero queremos calcular
   * las fechas según el timezone de Argentina (UTC-3). Por eso restamos
   * 3 horas al timestamp actual antes de extraer año/mes/día.
   */
  public static getPeriodRanges(periodType: PeriodType): DateRangeFilter {
    // Obtener fecha actual en timezone Argentina (UTC-3)
    const nowUTC = new Date();
    const nowArgentina = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // Restar 3 horas
    
    let startDate: Date;
    let endDate: Date;

    switch (periodType.type) {
      case 'hoy':
        // Obtener componentes del día en Argentina y construir fechas en UTC ajustadas
        // "Hoy" en Argentina = de 00:00 a 23:59 Argentina = de 03:00 UTC a 02:59 UTC (día siguiente)
        const year = nowArgentina.getFullYear();
        const month = nowArgentina.getMonth();
        const day = nowArgentina.getDate();
        
        startDate = new Date(Date.UTC(year, month, day, 3, 0, 0, 0)); // 00:00 Argentina = 03:00 UTC
        endDate = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999)); // 23:59 Argentina = 02:59 UTC (día siguiente)
        break;

      case 'ultimos_7_dias':
        // Calcular en timezone Argentina y ajustar a UTC
        const endYear7 = nowArgentina.getFullYear();
        const endMonth7 = nowArgentina.getMonth();
        const endDay7 = nowArgentina.getDate();
        
        endDate = new Date(Date.UTC(endYear7, endMonth7, endDay7 + 1, 2, 59, 59, 999)); // Fin del día hoy en Argentina
        startDate = new Date(Date.UTC(endYear7, endMonth7, endDay7 - 6, 3, 0, 0, 0)); // Inicio hace 6 días
        break;

      case 'ultimos_30_dias':
        // Calcular en timezone Argentina y ajustar a UTC
        const endYear30 = nowArgentina.getFullYear();
        const endMonth30 = nowArgentina.getMonth();
        const endDay30 = nowArgentina.getDate();
        
        endDate = new Date(Date.UTC(endYear30, endMonth30, endDay30 + 1, 2, 59, 59, 999)); // Fin del día hoy en Argentina
        startDate = new Date(Date.UTC(endYear30, endMonth30, endDay30 - 29, 3, 0, 0, 0)); // Inicio hace 29 días
        break;

      case 'ultimo_ano':
        // Calcular en timezone Argentina y ajustar a UTC
        const endYearAno = nowArgentina.getFullYear();
        const endMonthAno = nowArgentina.getMonth();
        const endDayAno = nowArgentina.getDate();
        
        endDate = new Date(Date.UTC(endYearAno, endMonthAno, endDayAno + 1, 2, 59, 59, 999)); // Fin del día hoy en Argentina
        startDate = new Date(Date.UTC(endYearAno - 1, endMonthAno, endDayAno, 3, 0, 0, 0)); // Inicio hace 1 año
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
