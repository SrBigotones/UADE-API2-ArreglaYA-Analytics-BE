import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { Usuario } from '../models/Usuario';
import { Servicio } from '../models/Servicio';
import { Solicitud } from '../models/Solicitud';
import { Cotizacion } from '../models/Cotizacion';
import { Habilidad } from '../models/Habilidad';
import { Zona } from '../models/Zona';
import { Pago } from '../models/Pago';
import { Prestador } from '../models/Prestador';
import { Rubro } from '../models/Rubro';
import { logger } from '../config/logger';

/**
 * Servicio para normalizar eventos y escribir en tablas especializadas
 * Esto mejora el rendimiento de las consultas de KPIs
 */
export class EventNormalizationService {
  /**
   * Procesa un evento y lo escribe en las tablas normalizadas correspondientes
   */
  public async normalizeEvent(event: Event): Promise<void> {
    try {
      const evento = event.evento.toLowerCase();
      
      // Mapeo de eventos a funciones de normalización
      // También manejar eventos en español
      if (evento.includes('user') || evento.includes('usuario')) {
        await this.processUserEvent(event);
      } else if (evento.includes('prestador') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion'))) {
        await this.processPrestadorEvent(event);
      } else if (evento.includes('rubro') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion'))) {
        await this.processRubroEvent(event);
      } else if (
        evento.includes('servicio') || evento.includes('provider') || 
        evento.includes('habilidad') ||
        evento.includes('skill') || evento.includes('zona') || evento.includes('zone')
      ) {
        await this.processServiceEvent(event);
      } else if (
        evento.includes('solicitud') || evento.includes('request') ||
        evento.includes('pedido') || evento.includes('order')
      ) {
        await this.processRequestEvent(event);
      } else if (
        evento.includes('cotizacion') || evento.includes('quote') ||
        evento.includes('cotización')
      ) {
        await this.processQuoteEvent(event);
      } else if (
        evento.includes('payment') || evento.includes('pago') ||
        evento.includes('refund') || evento.includes('reembolso')
      ) {
        await this.processPaymentEvent(event);
      }
    } catch (error) {
      logger.error(`Error normalizing event ${event.id}:`, error);
      // No lanzamos el error para no interrumpir el flujo principal
      // pero lo registramos para monitoreo
    }
  }

  /**
   * Procesa eventos de usuarios
   * Eventos: user_created, user_updated, user_deactivated, user_rejected
   */
  private async processUserEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const usuarioRepo = AppDataSource.getRepository(Usuario);

    // Extraer ID de usuario (puede estar en diferentes campos)
    const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.id || cuerpo.user_id);
    if (!idUsuario) {
      logger.warn(`No se pudo extraer id_usuario del evento ${event.id}`);
      return;
    }

    const evento = event.evento.toLowerCase();

    // Determinar estado basado en el evento
    let estado = 'activo';
    if (evento.includes('deactivated') || evento.includes('baja')) {
      estado = 'baja';
    } else if (evento.includes('rejected') || evento.includes('rechazado')) {
      estado = 'rechazado';
    } else if (evento.includes('created') || evento.includes('updated')) {
      estado = 'activo';
    }

    // Extraer rol
    const rol = cuerpo.role || cuerpo.rol || cuerpo.tipo_usuario || 'unknown';

    // Extraer ubicación (solo para prestadores)
    const ubicacion = (rol === 'prestador' || rol === 'provider') 
      ? (cuerpo.location || cuerpo.ubicacion || cuerpo.city || cuerpo.provincia)
      : null;

    // Usar upsert para insertar o actualizar
    await usuarioRepo.save({
      id_usuario: idUsuario,
      rol: rol,
      estado: estado,
      timestamp: event.timestamp,
      ubicacion: ubicacion || null,
    } as Usuario);

    logger.debug(`Normalized user event ${event.id} -> usuario ${idUsuario}`);
  }

  /**
   * Procesa eventos de servicios
   * Eventos: prestador.alta, prestador.baja, habilidad.alta, habilidad.baja
   */
  private async processServiceEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const servicioRepo = AppDataSource.getRepository(Servicio);
    const habilidadRepo = AppDataSource.getRepository(Habilidad);
    const zonaRepo = AppDataSource.getRepository(Zona);

    const evento = event.evento.toLowerCase();

    // Procesar servicios de prestadores
    if (evento.includes('prestador') || evento.includes('provider')) {
      const idUsuario = this.extractBigInt(cuerpo.providerId || cuerpo.prestadorId || cuerpo.id_usuario || cuerpo.userId || cuerpo.id);
      const idServicio = this.extractBigInt(cuerpo.serviceId || cuerpo.servicioId || cuerpo.id_servicio || cuerpo.id);

      if (idUsuario && idServicio) {
        const activo = !evento.includes('baja') && !evento.includes('deactivate');

        await servicioRepo.save({
          id_servicio: idServicio,
          id_usuario: idUsuario,
          activo: activo,
          timestamp: event.timestamp,
        } as Servicio);

        logger.debug(`Normalized service event ${event.id} -> servicio ${idServicio}`);
      }
    }

    // Procesar habilidades
    if (evento.includes('habilidad') || evento.includes('skill')) {
      const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.providerId || cuerpo.prestadorId);
      const idHabilidad = this.extractBigInt(cuerpo.habilidadId || cuerpo.skillId || cuerpo.id_habilidad || cuerpo.id);
      const nombreHabilidad = cuerpo.nombre || cuerpo.name || cuerpo.habilidad || cuerpo.skill || 'unknown';

      if (idUsuario && idHabilidad) {
        const activa = !evento.includes('baja') && !evento.includes('deactivate');

        await habilidadRepo.save({
          id_usuario: idUsuario,
          id_habilidad: idHabilidad,
          nombre_habilidad: nombreHabilidad,
          activa: activa,
        } as Habilidad);

        logger.debug(`Normalized skill event ${event.id} -> habilidad ${idHabilidad} para usuario ${idUsuario}`);
      }

      // Si hay múltiples habilidades en un array (prestador.modificacion)
      if (cuerpo.habilidades && Array.isArray(cuerpo.habilidades)) {
        for (const hab of cuerpo.habilidades) {
          const habId = this.extractBigInt(hab.id || hab.id_habilidad || hab.habilidadId);
          const habNombre = hab.nombre || hab.name || hab.habilidad || 'unknown';
          
          if (idUsuario && habId) {
            await habilidadRepo.save({
              id_usuario: idUsuario,
              id_habilidad: habId,
              nombre_habilidad: habNombre,
              activa: true,
            } as Habilidad);
          }
        }
      }
    }

    // Procesar zonas (similar a habilidades)
    if (evento.includes('zona') || evento.includes('zone')) {
      const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.providerId || cuerpo.prestadorId);
      const idZona = this.extractBigInt(cuerpo.zonaId || cuerpo.zoneId || cuerpo.id_zona || cuerpo.id);
      const nombreZona = cuerpo.nombre || cuerpo.name || cuerpo.zona || cuerpo.zone || 'unknown';

      if (idUsuario && idZona) {
        const activa = !evento.includes('baja') && !evento.includes('deactivate');

        await zonaRepo.save({
          id_usuario: idUsuario,
          id_zona: idZona,
          nombre_zona: nombreZona,
          activa: activa,
        } as Zona);

        logger.debug(`Normalized zone event ${event.id} -> zona ${idZona} para usuario ${idUsuario}`);
      }

      // Si hay múltiples zonas en un array
      if (cuerpo.zonas && Array.isArray(cuerpo.zonas)) {
        for (const zon of cuerpo.zonas) {
          const zonId = this.extractBigInt(zon.id || zon.id_zona || zon.zonaId);
          const zonNombre = zon.nombre || zon.name || zon.zona || 'unknown';
          
          if (idUsuario && zonId) {
            await zonaRepo.save({
              id_usuario: idUsuario,
              id_zona: zonId,
              nombre_zona: zonNombre,
              activa: true,
            } as Zona);
          }
        }
      }
    }
  }

  /**
   * Procesa eventos de solicitudes
   * Eventos: solicitud.creada, solicitud.cancelada, cotizacion.aceptada, pedido_finalizado, pedido_cancelado
   */
  private async processRequestEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const solicitudRepo = AppDataSource.getRepository(Solicitud);

    const evento = event.evento.toLowerCase();

    const idSolicitud = this.extractBigInt(
      cuerpo.requestId || cuerpo.solicitudId || cuerpo.id_solicitud || 
      cuerpo.orderId || cuerpo.pedidoId || cuerpo.id
    );
    const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.clienteId);
    const idPrestador = this.extractBigInt(cuerpo.providerId || cuerpo.prestadorId || cuerpo.id_prestador);

    if (!idSolicitud || !idUsuario) {
      logger.warn(`No se pudo extraer datos de solicitud del evento ${event.id}`);
      return;
    }

    // Determinar estado basado en el evento
    let estado = 'creada';
    if (evento.includes('cancelada') || evento.includes('cancel')) {
      estado = 'cancelada';
    } else if (evento.includes('aceptada') || evento.includes('accept') || evento.includes('finalizado')) {
      estado = 'aceptada';
    } else if (evento.includes('rechazada') || evento.includes('reject')) {
      estado = 'rechazada';
    }

    const zona = cuerpo.zona || cuerpo.location || cuerpo.ciudad || cuerpo.provincia;
    const esCritica = cuerpo.urgency === 'high' || cuerpo.es_critica === true || cuerpo.critica === true;

    await solicitudRepo.save({
      id_solicitud: idSolicitud,
      id_usuario: idUsuario,
      id_prestador: idPrestador || null,
      estado: estado,
      zona: zona || null,
      timestamp: event.timestamp,
      es_critica: esCritica || false,
    } as Solicitud);

    logger.debug(`Normalized request event ${event.id} -> solicitud ${idSolicitud}`);
  }

  /**
   * Procesa eventos de cotizaciones
   * Eventos: cotizacion.emitida, cotizacion.aceptada, cotizacion.rechazada, cotizacion.expirada
   */
  private async processQuoteEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const cotizacionRepo = AppDataSource.getRepository(Cotizacion);

    const evento = event.evento.toLowerCase();

    const idCotizacion = this.extractBigInt(
      cuerpo.quoteId || cuerpo.cotizacionId || cuerpo.id_cotizacion || cuerpo.id
    );
    const idSolicitud = this.extractBigInt(
      cuerpo.requestId || cuerpo.solicitudId || cuerpo.id_solicitud || cuerpo.orderId
    );
    const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.clienteId);
    const idPrestador = this.extractBigInt(cuerpo.providerId || cuerpo.prestadorId || cuerpo.id_prestador);

    if (!idCotizacion || !idSolicitud || !idUsuario || !idPrestador) {
      logger.warn(`No se pudo extraer datos de cotizacion del evento ${event.id}`);
      return;
    }

    // Determinar estado basado en el evento
    // Manejar eventos en español: "Cotización Emitida", "Cotización Aceptada", etc.
    let estado = 'emitida';
    if (evento.includes('aceptada') || evento.includes('accept')) {
      estado = 'aceptada';
    } else if (evento.includes('rechazada') || evento.includes('reject')) {
      estado = 'rechazada';
    } else if (evento.includes('expirada') || evento.includes('expired')) {
      estado = 'expirada';
    } else if (evento.includes('emitida') || evento.includes('emitted') || evento.includes('created')) {
      estado = 'emitida';
    }

    const monto = this.extractDecimal(cuerpo.amount || cuerpo.monto || cuerpo.price || cuerpo.precio);

    await cotizacionRepo.save({
      id_cotizacion: idCotizacion,
      id_solicitud: idSolicitud,
      id_usuario: idUsuario,
      id_prestador: idPrestador,
      estado: estado,
      monto: monto,
      timestamp: event.timestamp,
    } as Cotizacion);

    logger.debug(`Normalized quote event ${event.id} -> cotizacion ${idCotizacion}`);
  }

  /**
   * Procesa eventos de pagos
   * Eventos: payment.created, payment.method_selected, payment.status_updated, 
   *          payment.approved, payment.rejected, payment.expired, refund.completed
   */
  private async processPaymentEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const pagoRepo = AppDataSource.getRepository(Pago);

    const evento = event.evento.toLowerCase();

    const idPago = this.extractBigInt(
      cuerpo.paymentId || cuerpo.pagoId || cuerpo.id_pago || cuerpo.id
    );
    const idUsuario = this.extractBigInt(cuerpo.userId || cuerpo.id_usuario || cuerpo.clienteId);
    const idPrestador = this.extractBigInt(cuerpo.providerId || cuerpo.prestadorId || cuerpo.id_prestador);
    const idSolicitud = this.extractBigInt(
      cuerpo.requestId || cuerpo.solicitudId || cuerpo.id_solicitud || cuerpo.orderId
    );

    if (!idPago || !idUsuario) {
      logger.warn(`No se pudo extraer datos de pago del evento ${event.id}`);
      return;
    }

    // Determinar estado basado en el evento
    let estado = 'pending';
    if (evento.includes('approved') || evento.includes('aprobado')) {
      estado = 'approved';
    } else if (evento.includes('rejected') || evento.includes('rechazado')) {
      estado = 'rejected';
    } else if (evento.includes('expired') || evento.includes('expirado')) {
      estado = 'expired';
    } else if (evento.includes('refund') || evento.includes('reembolso')) {
      estado = 'refunded';
    }

    const montoTotal = this.extractDecimal(
      cuerpo.amount || cuerpo.monto || cuerpo.monto_total || cuerpo.total || 0
    );
    const moneda = cuerpo.currency || cuerpo.moneda || 'ARS';
    const metodo = cuerpo.method || cuerpo.metodo || cuerpo.paymentMethod;

    // Para payment.created, usar timestamp del evento como timestamp_creado
    // Para otros eventos, buscar el pago existente y actualizar timestamp_actual
    const timestampCreado = evento.includes('created') 
      ? event.timestamp 
      : event.timestamp; // En otros casos, se actualizará desde el registro existente

    const capturedAt = estado === 'approved' ? event.timestamp : null;
    const refundId = estado === 'refunded' 
      ? this.extractBigInt(cuerpo.refundId || cuerpo.id_reembolso)
      : null;

    // Buscar pago existente
    const existingPago = await pagoRepo.findOne({ where: { id_pago: idPago } });

    if (existingPago) {
      // Actualizar pago existente
      await pagoRepo.save({
        ...existingPago,
        estado: estado,
        metodo: metodo || existingPago.metodo,
        timestamp_actual: event.timestamp,
        captured_at: capturedAt || existingPago.captured_at,
        refund_id: refundId || existingPago.refund_id,
      });
    } else {
      // Crear nuevo pago (solo para payment.created)
      if (evento.includes('created')) {
        await pagoRepo.save({
          id_pago: idPago,
          id_usuario: idUsuario,
          id_prestador: idPrestador || null,
          id_solicitud: idSolicitud || null,
          monto_total: montoTotal,
          moneda: moneda,
          metodo: metodo || null,
          estado: estado,
          timestamp_creado: timestampCreado,
          timestamp_actual: event.timestamp,
          captured_at: capturedAt,
          refund_id: refundId,
        } as Pago);
      }
    }

    logger.debug(`Normalized payment event ${event.id} -> pago ${idPago}`);
  }

  /**
   * Procesa eventos de prestadores
   * Eventos: prestador.alta, prestador.baja, prestador.modificacion
   */
  private async processPrestadorEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const prestadorRepo = AppDataSource.getRepository(Prestador);

    const idPrestador = this.extractBigInt(
      cuerpo.prestadorId || cuerpo.id_prestador || cuerpo.providerId || cuerpo.id
    );

    if (!idPrestador) {
      logger.warn(`No se pudo extraer id_prestador del evento ${event.id}`);
      return;
    }

    const evento = event.evento.toLowerCase();

    // Determinar estado
    let estado = 'activo';
    if (evento.includes('baja')) {
      estado = 'baja';
    }

    // Extraer nombre y apellido
    const nombre = cuerpo.nombre || cuerpo.name || cuerpo.firstName || null;
    const apellido = cuerpo.apellido || cuerpo.lastName || null;

    // Determinar si el perfil está completo
    // Se considera completo si tiene: nombre, apellido, y otros campos importantes
    const perfilCompleto = !!(nombre && apellido && 
      (cuerpo.foto || cuerpo.photo) && 
      (cuerpo.zonas || cuerpo.zones) && 
      (cuerpo.habilidades || cuerpo.skills));

    // Usar upsert para insertar o actualizar
    await prestadorRepo.save({
      id_prestador: idPrestador,
      nombre: nombre,
      apellido: apellido,
      estado: estado,
      timestamp: event.timestamp,
      perfil_completo: perfilCompleto,
    } as Prestador);

    logger.debug(`Normalized prestador event ${event.id} -> prestador ${idPrestador}`);
  }

  /**
   * Procesa eventos de rubros
   * Eventos: rubro.alta, rubro.modificacion, rubro.baja
   */
  private async processRubroEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const rubroRepo = AppDataSource.getRepository(Rubro);

    const idRubro = this.extractBigInt(
      cuerpo.rubroId || cuerpo.id_rubro || cuerpo.id
    );

    if (!idRubro) {
      logger.warn(`No se pudo extraer id_rubro del evento ${event.id}`);
      return;
    }

    const evento = event.evento.toLowerCase();

    // Si es baja, eliminar el registro (o marcarlo como inactivo si no queremos eliminar)
    if (evento.includes('baja')) {
      await rubroRepo.delete({ id_rubro: idRubro });
      logger.debug(`Deleted rubro ${idRubro} from event ${event.id}`);
      return;
    }

    // Extraer nombre del rubro
    const nombreRubro = cuerpo.nombre || cuerpo.name || cuerpo.nombre_rubro || cuerpo.rubro || 'unknown';

    // Usar upsert para insertar o actualizar
    await rubroRepo.save({
      id_rubro: idRubro,
      nombre_rubro: nombreRubro,
    } as Rubro);

    logger.debug(`Normalized rubro event ${event.id} -> rubro ${idRubro}`);
  }

  /**
   * Extrae un BigInt de diferentes formatos
   */
  private extractBigInt(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    // Si es string numérico
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    }
    
    // Si es número
    if (typeof value === 'number') {
      return Math.floor(value);
    }

    return null;
  }

  /**
   * Extrae un Decimal de diferentes formatos
   */
  private extractDecimal(value: any): number {
    if (value === null || value === undefined) return 0;
    
    // Si es string numérico
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Si es número
    if (typeof value === 'number') {
      return value;
    }

    return 0;
  }
}

