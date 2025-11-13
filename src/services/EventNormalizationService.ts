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
      const topico = event.topico.toLowerCase();
      
      logger.info(`🔄 NORMALIZATION | eventId: ${event.id} | squad: ${event.squad} | topico: ${topico} | evento: ${evento}`);
      
      // Mapeo de eventos a funciones de normalización
      // PRIORIDAD: Filtrar por TOPICO primero, luego por EVENTO
      
      // 1. Pagos: topico = 'payment'
      if (topico === 'payment') {
        logger.info(`💳 Processing PAYMENT event`);
        await this.processPaymentEvent(event);
      }
      // 2. Usuarios: topico = 'user' o evento contiene 'user'/'usuario'
      else if (topico === 'user' || evento.includes('user') || evento.includes('usuario')) {
        logger.info(`👤 Processing USER event`);
        await this.processUserEvent(event);
      }
      // 3. Cotizaciones: topico = 'cotizacion' o eventos especiales con cotizaciones
      else if (topico === 'cotizacion' || evento.includes('cotizacion') || evento.includes('quote') || evento.includes('cotización') || evento === 'resumen') {
        logger.info(`� Processing COTIZACION event`);
        await this.processQuoteEvent(event);
      }
      // 4. Solicitudes: topico = 'solicitud' o evento contiene 'solicitud'/'request'
      else if (topico === 'solicitud' || evento.includes('solicitud') || evento.includes('request') || evento.includes('pedido') || evento.includes('order')) {
        logger.info(`� Processing SOLICITUD event`);
        await this.processRequestEvent(event);
      }
      // 5. Prestadores: topico = 'prestador' o eventos de prestador
      else if (topico === 'prestador' || (evento.includes('prestador') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion')))) {
        logger.info(`👨‍🔧 Processing PRESTADOR event`);
        await this.processPrestadorEvent(event);
      }
      // 6. Rubros: topico = 'rubro' o eventos de rubro
      else if (topico === 'rubro' || (evento.includes('rubro') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion')))) {
        logger.info(`📋 Processing RUBRO event`);
        await this.processRubroEvent(event);
      }
      // 7. Servicios, Habilidades, Zonas
      else if (
        topico === 'servicio' || topico === 'habilidad' || topico === 'zona' ||
        evento.includes('servicio') || evento.includes('provider') || 
        evento.includes('habilidad') || evento.includes('skill') || 
        evento.includes('zona') || evento.includes('zone')
      ) {
        logger.info(`🛠️ Processing SERVICE/SKILL/ZONE event`);
        await this.processServiceEvent(event);
      }
      else {
        logger.warn(`⚠️ No handler for topico: ${topico} | evento: ${evento}`);
      }
      
      logger.info(`✅ NORMALIZATION DONE | eventId: ${event.id}`);
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

    logger.debug(`👤 USER event | eventId: ${event.id}`);

    // IMPORTANTE: Los datos pueden estar en cuerpo.payload (Core Hub) o directamente en cuerpo (webhook directo)
    const payload = cuerpo.payload || cuerpo;
    
    logger.debug(`📦 Payload keys: ${Object.keys(payload).join(', ')}`);

    // Extraer ID de usuario (puede estar en diferentes campos)
    const idUsuario = this.extractBigInt(
      payload.userId || 
      payload.id_usuario || 
      payload.id || 
      payload.user_id ||
      cuerpo.userId || 
      cuerpo.id_usuario || 
      cuerpo.id || 
      cuerpo.user_id
    );
    
    logger.info(`🔍 userId extracted: ${idUsuario}`);
    
    if (!idUsuario) {
      logger.warn(`❌ No userId found in event ${event.id}`);
      logger.debug(`Available payload: ${JSON.stringify(payload, null, 2).substring(0, 300)}`);
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

    // Extraer rol (buscar en payload primero, luego en cuerpo)
    const rol = payload.role || payload.rol || payload.tipo_usuario || 
                cuerpo.role || cuerpo.rol || cuerpo.tipo_usuario || 'unknown';

    // Extraer ubicación (solo para prestadores)
    // Buscar en addresses array primero (estructura Core Hub)
    let ubicacion = null;
    if (rol.toUpperCase() === 'PRESTADOR' || rol === 'provider') {
      if (payload.addresses && Array.isArray(payload.addresses) && payload.addresses.length > 0) {
        // Tomar la primera dirección
        const firstAddress = payload.addresses[0];
        ubicacion = firstAddress.city || firstAddress.state;
      } else if (payload.address && Array.isArray(payload.address) && payload.address.length > 0) {
        const firstAddress = payload.address[0];
        ubicacion = firstAddress.city || firstAddress.state;
      } else {
        ubicacion = payload.location || payload.ubicacion || payload.city || payload.provincia ||
                    cuerpo.location || cuerpo.ubicacion || cuerpo.city || cuerpo.provincia;
      }
    }

    logger.info(`💾 Saving usuario | id: ${idUsuario} | rol: ${rol} | estado: ${estado}`);

    // Usar upsert para insertar o actualizar basado en id_usuario (unique constraint)
    await usuarioRepo.upsert(
      {
        id_usuario: idUsuario,
        rol: rol,
        estado: estado,
        timestamp: event.timestamp,
        ubicacion: ubicacion || null,
      },
      ['id_usuario'] // Conflict target: unique constraint en id_usuario
    );

    logger.info(`✅ Usuario ${idUsuario} saved to DB`);
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
    const payload = this.extractPayload(cuerpo);
    const solicitudRepo = AppDataSource.getRepository(Solicitud);

    const evento = event.evento.toLowerCase();

    const idSolicitud = this.extractBigInt(
      payload.requestId || payload.solicitudId || payload.id_solicitud || payload.solicitud_id ||
      payload.orderId || payload.pedidoId || payload.id
    );
    const idUsuario = this.extractBigInt(
      payload.userId || payload.id_usuario || payload.usuario_id || payload.clienteId
    );
    const idPrestador = this.extractBigInt(
      payload.providerId || payload.prestadorId || payload.prestador_id || payload.id_prestador
    );

    if (!idSolicitud || !idUsuario) {
      logger.warn(`❌ No se pudo extraer datos de solicitud del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.warn(`   idSolicitud: ${idSolicitud} | idUsuario: ${idUsuario}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
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
    } else if (evento.includes('creada') || evento.includes('created')) {
      estado = 'creada';
    } else if (evento.includes('solicitado')) {
      estado = 'creada'; // 'solicitado' es equivalente a 'creada'
    }

    // Extraer zona de diferentes estructuras posibles
    let zona = null;
    if (payload.direccion) {
      zona = payload.direccion.ciudad || payload.direccion.provincia;
    } else {
      zona = payload.zona || payload.location || payload.ciudad || payload.provincia;
    }

    const esCritica = payload.urgency === 'high' || 
                      payload.es_critica === true || 
                      payload.critica === true ||
                      payload.es_urgente === true;

    logger.info(`💾 Saving solicitud | id: ${idSolicitud} | usuario: ${idUsuario} | estado: ${estado}`);

    await solicitudRepo.upsert(
      {
        id_solicitud: idSolicitud,
        id_usuario: idUsuario,
        id_prestador: idPrestador || null,
        estado: estado,
        zona: zona || null,
        timestamp: event.timestamp,
        es_critica: esCritica || false,
      },
      ['id_solicitud'] // Conflict target: unique constraint en id_solicitud
    );

    logger.info(`✅ Solicitud ${idSolicitud} saved`);
  }

  /**
   * Procesa eventos de cotizaciones
   * Eventos: cotizacion.emitida, cotizacion.aceptada, cotizacion.rechazada, cotizacion.expirada
   * También: matching.cotizacion.emitida (eventos batch del servicio de matching)
   */
  private async processQuoteEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const cotizacionRepo = AppDataSource.getRepository(Cotizacion);

    const evento = event.evento.toLowerCase();

    // Caso especial: solicitud.resumen con cotizaciones reales
    if (evento.includes('resumen') && payload.solicitud && payload.solicitud.cotizaciones) {
      logger.info(`📊 Processing RESUMEN cotizaciones | solicitudId: ${payload.solicitud.solicitudId}`);
      
      const idSolicitud = this.extractBigInt(payload.solicitud.solicitudId);
      if (!idSolicitud) {
        logger.warn(`❌ No solicitudId in resumen event ${event.id}`);
        return;
      }

      const cotizaciones = payload.solicitud.cotizaciones;
      if (!Array.isArray(cotizaciones)) {
        logger.warn(`❌ cotizaciones is not an array in resumen event ${event.id}`);
        return;
      }

      for (const cotizacion of cotizaciones) {
        const idCotizacion = this.extractBigInt(cotizacion.cotizacionId);
        const idPrestador = this.extractBigInt(cotizacion.prestadorId);
        const monto = this.extractDecimal(cotizacion.monto);

        if (!idCotizacion || !idPrestador) {
          logger.warn(`⚠️ Skipping cotizacion without id or prestador in resumen`);
          continue;
        }

        logger.info(`💾 Saving cotizacion from resumen | id: ${idCotizacion} | solicitud: ${idSolicitud} | prestador: ${idPrestador} | monto: ${monto}`);

        await cotizacionRepo.upsert(
          {
            id_cotizacion: idCotizacion,
            id_solicitud: idSolicitud,
            id_usuario: null, // No viene en el resumen
            id_prestador: idPrestador,
            estado: 'emitida',
            monto: monto || null,
            timestamp: event.timestamp,
          },
          ['id_cotizacion']
        );
      }

      logger.info(`✅ Resumen cotizaciones processed | total: ${cotizaciones.length}`);
      return;
    }

    // Caso especial: matching.emitida viene con array de solicitudes con top3 de cotizaciones
    if (evento.includes('emitida') && payload.solicitudes && Array.isArray(payload.solicitudes)) {
      logger.info(`📊 Processing BATCH cotizaciones | count: ${payload.solicitudes.length}`);
      
      for (const solicitud of payload.solicitudes) {
        if (!solicitud.top3 || !Array.isArray(solicitud.top3)) continue;
        
        for (const cotizacion of solicitud.top3) {
          const idCotizacion = this.extractBigInt(cotizacion.cotizacionId);
          const idSolicitud = this.extractBigInt(cotizacion.solicitudId);
          const idPrestador = this.extractBigInt(cotizacion.prestadorId);
          const idUsuario = this.extractBigInt(solicitud.usuarioId); // Del padre

          // Si no hay cotizacionId, es solo una invitación, skip
          if (!idCotizacion || !idSolicitud || !idPrestador) {
            continue;
          }

          // Las cotizaciones del batch no tienen id_cotizacion hasta que son emitidas realmente
          // Por ahora insertamos sin upsert (pueden ser duplicados)
          await cotizacionRepo.insert({
            id_cotizacion: idCotizacion,
            id_solicitud: idSolicitud,
            id_usuario: idUsuario || null,
            id_prestador: idPrestador,
            estado: 'emitida',
            monto: null,
            timestamp: event.timestamp,
          });

          logger.debug(`Saved cotizacion ${idCotizacion} from batch`);
        }
      }
      logger.info(`✅ Batch cotizaciones processed`);
      return;
    }

    // Caso normal: cotizacion individual
    const idCotizacion = this.extractBigInt(
      payload.quoteId || payload.cotizacionId || payload.id_cotizacion || payload.id
    );
    const idSolicitud = this.extractBigInt(
      payload.requestId || payload.solicitudId || payload.id_solicitud || payload.orderId
    );
    const idUsuario = this.extractBigInt(
      payload.userId || payload.id_usuario || payload.clienteId
    );
    const idPrestador = this.extractBigInt(
      payload.providerId || payload.prestadorId || payload.id_prestador
    );

    if (!idCotizacion || !idSolicitud || !idPrestador) {
      logger.warn(`❌ No se pudo extraer datos de cotizacion del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.warn(`   idCotizacion: ${idCotizacion} | idSolicitud: ${idSolicitud} | idPrestador: ${idPrestador}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    // Determinar estado basado en el evento
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

    const monto = this.extractDecimal(
      payload.amount || payload.monto || payload.price || payload.precio
    );

    logger.info(`💾 Saving cotizacion | id: ${idCotizacion} | solicitud: ${idSolicitud} | estado: ${estado}`);

    // Las cotizaciones individuales tienen id_cotizacion, usamos upsert solo si existe
    if (idCotizacion) {
      await cotizacionRepo.upsert(
        {
          id_cotizacion: idCotizacion,
          id_solicitud: idSolicitud,
          id_usuario: idUsuario || null,
          id_prestador: idPrestador,
          estado: estado,
          monto: monto || null,
          timestamp: event.timestamp,
        },
        ['id_cotizacion'] // Solo actualizar si ya existe esa cotizacion
      );
    } else {
      // Sin id_cotizacion, solo insert
      await cotizacionRepo.insert({
        id_solicitud: idSolicitud,
        id_usuario: idUsuario || null,
        id_prestador: idPrestador,
        estado: estado,
        monto: monto || null,
        timestamp: event.timestamp,
      });
    }

    logger.info(`✅ Cotizacion ${idCotizacion || 'sin id'} saved`);
  }

  /**
   * Procesa eventos de pagos
   * Eventos: payment.created, payment.method_selected, payment.status_updated, 
   *          payment.approved, payment.rejected, payment.expired, refund.completed
   */
  private async processPaymentEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const pagoRepo = AppDataSource.getRepository(Pago);

    const evento = event.evento.toLowerCase();

    const idPago = this.extractBigInt(
      payload.paymentId || payload.pagoId || payload.id_pago || payload.id
    );
    const idUsuario = this.extractBigInt(
      payload.userId || payload.id_usuario || payload.clienteId
    );
    const idPrestador = this.extractBigInt(
      payload.providerId || payload.prestadorId || payload.id_prestador
    );
    const idSolicitud = this.extractBigInt(
      payload.requestId || payload.solicitudId || payload.id_solicitud || payload.orderId
    );

    // Para eventos status_updated, solo necesitamos idPago (el userId ya existe en el registro)
    const isStatusUpdate = evento.includes('status_updated') || evento.includes('update');
    
    if (!idPago) {
      logger.warn(`❌ No se pudo extraer idPago del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.warn(`   idPago: ${idPago}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    if (!isStatusUpdate && !idUsuario) {
      logger.warn(`❌ No se pudo extraer idUsuario del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.warn(`   idPago: ${idPago} | idUsuario: ${idUsuario}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    // Determinar estado basado en el evento y el campo status del payload
    // Para eventos status_updated, el estado está en newStatus
    const statusField = payload.newStatus || payload.status || 'PENDING_PAYMENT';
    let estado = 'pending';
    
    // Mapear estados del payload a nuestros estados
    if (statusField === 'PENDING_PAYMENT' || statusField === 'pending') {
      estado = 'pending';
    } else if (statusField === 'APPROVED' || statusField === 'approved' || evento.includes('approved')) {
      estado = 'approved';
    } else if (statusField === 'REJECTED' || statusField === 'rejected' || evento.includes('rejected')) {
      estado = 'rejected';
    } else if (statusField === 'EXPIRED' || statusField === 'expired' || evento.includes('expired')) {
      estado = 'expired';
    } else if (statusField === 'REFUNDED' || statusField === 'refunded' || evento.includes('refund') || evento.includes('reembolso')) {
      estado = 'refunded';
    }

    const montoTotal = this.extractDecimal(
      payload.amountTotal || payload.amount || payload.monto || payload.monto_total || payload.total || 0
    );
    const moneda = payload.currency || payload.moneda || 'ARS';
    
    // Para eventos method_selected, el método está en methodType
    let metodo = null;
    if (evento.includes('method_selected')) {
      metodo = payload.methodType || payload.method || payload.metodo;
    } else {
      metodo = payload.method || payload.metodo || payload.paymentMethod || payload.metodoPago;
    }

    const timestampCreado = evento.includes('created') 
      ? event.timestamp 
      : event.timestamp;

    // Para captured_at, usar updatedAt si existe (eventos status_updated), sino usar event.timestamp
    let capturedAt = null;
    if (estado === 'approved') {
      if (payload.updatedAt && Array.isArray(payload.updatedAt)) {
        // updatedAt viene como array [year, month, day, hour, minute, second, nanosecond]
        const [year, month, day, hour, minute, second] = payload.updatedAt;
        capturedAt = new Date(year, month - 1, day, hour, minute, second);
      } else {
        capturedAt = event.timestamp;
      }
    }

    const refundId = estado === 'refunded' 
      ? this.extractBigInt(payload.refundId || payload.id_reembolso)
      : null;

    // Buscar pago existente
    const existingPago = await pagoRepo.findOne({ where: { id_pago: idPago } });

    if (existingPago) {
      // Actualizar pago existente usando upsert
      logger.info(`🔄 Updating pago | id: ${idPago} | old_estado: ${existingPago.estado} | new_estado: ${estado}`);
      
      // Si el pago existente no tiene userId pero el evento sí, actualizarlo
      const finalUserId = existingPago.id_usuario || idUsuario || null;
      
      await pagoRepo.upsert(
        {
          id_pago: idPago,
          id_usuario: finalUserId,
          id_prestador: idPrestador || existingPago.id_prestador,
          id_solicitud: idSolicitud || existingPago.id_solicitud,
          monto_total: montoTotal || existingPago.monto_total,
          moneda: moneda,
          metodo: metodo || existingPago.metodo,
          estado: estado,
          timestamp_creado: existingPago.timestamp_creado,
          timestamp_actual: event.timestamp,
          captured_at: capturedAt || existingPago.captured_at,
          refund_id: refundId || existingPago.refund_id,
        },
        ['id_pago']
      );
      logger.info(`✅ Pago ${idPago} updated to estado: ${estado}`);
    } else {
      // Crear nuevo pago
      // Nota: puede no tener userId si es un evento status_updated que llegó antes que created
      if (!idUsuario) {
        logger.warn(`⚠️ Creando pago ${idPago} sin userId. Evento: ${event.evento}`);
        logger.warn(`   El userId se completará cuando llegue el evento 'created'`);
      }
      
      logger.info(`💾 Creating pago | id: ${idPago} | usuario: ${idUsuario || 'NULL'} | estado: ${estado}`);
      await pagoRepo.upsert(
        {
          id_pago: idPago,
          id_usuario: idUsuario || null,
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
        },
        ['id_pago']
      );
      logger.info(`✅ Pago ${idPago} created`);
    }
  }

  /**
   * Procesa eventos de prestadores
   * Eventos: prestador.alta, prestador.baja, prestador.modificacion
   */
  private async processPrestadorEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const prestadorRepo = AppDataSource.getRepository(Prestador);

    const idPrestador = this.extractBigInt(
      payload.prestadorId || payload.id_prestador || payload.providerId || payload.userId || payload.id
    );

    if (!idPrestador) {
      logger.warn(`❌ No se pudo extraer id_prestador del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    const evento = event.evento.toLowerCase();

    // Determinar estado
    let estado = 'activo';
    if (evento.includes('baja')) {
      estado = 'baja';
    }

    // Extraer nombre y apellido
    const nombre = payload.nombre || payload.name || payload.firstName || null;
    const apellido = payload.apellido || payload.lastName || null;

    // Determinar si el perfil está completo
    const perfilCompleto = !!(nombre && apellido && 
      (payload.foto || payload.photo) && 
      (payload.zonas || payload.zones) && 
      (payload.habilidades || payload.skills));

    logger.info(`💾 Saving prestador | id: ${idPrestador} | estado: ${estado}`);

    await prestadorRepo.upsert(
      {
        id_prestador: idPrestador,
        nombre: nombre,
        apellido: apellido,
        estado: estado,
        timestamp: event.timestamp,
        perfil_completo: perfilCompleto,
      },
      ['id_prestador'] // Conflict target: unique constraint en id_prestador
    );

    logger.info(`✅ Prestador ${idPrestador} saved`);

    // Procesar habilidades del prestador si vienen en el payload
    if (payload.habilidades && Array.isArray(payload.habilidades)) {
      const habilidadRepo = AppDataSource.getRepository(Habilidad);
      logger.info(`🔧 Processing ${payload.habilidades.length} habilidades for prestador ${idPrestador}`);
      
      for (const hab of payload.habilidades) {
        const habId = this.extractBigInt(hab.id || hab.id_habilidad || hab.habilidadId);
        const habNombre = hab.nombre || hab.name || 'unknown';
        
        if (habId) {
          await habilidadRepo.upsert(
            {
              id_usuario: idPrestador,
              id_habilidad: habId,
              nombre_habilidad: habNombre,
              activa: true,
            },
            ['id_usuario', 'id_habilidad']
          );
          logger.debug(`  ✅ Habilidad ${habId} (${habNombre}) saved for prestador ${idPrestador}`);
        }
      }
    }
  }

  /**
   * Procesa eventos de rubros
   * Eventos: rubro.alta, rubro.modificacion, rubro.baja
   */
  private async processRubroEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const rubroRepo = AppDataSource.getRepository(Rubro);

    const idRubro = this.extractBigInt(
      payload.rubroId || payload.id_rubro || payload.id
    );

    if (!idRubro) {
      logger.warn(`❌ No se pudo extraer id_rubro del evento ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    const evento = event.evento.toLowerCase();

    // Si es baja, eliminar el registro
    if (evento.includes('baja')) {
      await rubroRepo.delete({ id_rubro: idRubro });
      logger.info(`🗑️ Deleted rubro ${idRubro}`);
      return;
    }

    // Extraer nombre del rubro
    const nombreRubro = payload.nombre || payload.name || payload.nombre_rubro || payload.rubro || 'unknown';

    logger.info(`💾 Saving rubro | id: ${idRubro} | nombre: ${nombreRubro}`);

    await rubroRepo.save({
      id_rubro: idRubro,
      nombre_rubro: nombreRubro,
    } as Rubro);

    logger.info(`✅ Rubro ${idRubro} saved`);
  }

  /**
   * Extrae un BigInt de diferentes formatos
   * Maneja números, strings numéricos, y filtra strings no numéricos (ej: "HAB_002")
   */
  private extractBigInt(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    // Si es string
    if (typeof value === 'string') {
      // Intentar extraer solo los dígitos del string
      // Esto maneja casos como "PREST_001" -> 1, "HAB_005" -> 5, etc.
      const digitsOnly = value.replace(/\D/g, ''); // Elimina todo excepto dígitos
      
      if (digitsOnly.length === 0) {
        return null; // No hay dígitos
      }
      
      const parsed = parseInt(digitsOnly, 10);
      
      // Si el string original contenía letras, logear warning
      if (/[a-zA-Z]/.test(value) && !isNaN(parsed)) {
        logger.warn(`⚠️ Extracted numeric ID ${parsed} from string "${value}". Consider using numeric IDs.`);
      }
      
      return isNaN(parsed) ? null : parsed;
    }
    
    // Si es número
    if (typeof value === 'number') {
      return Math.floor(value);
    }

    return null;
  }

  /**
   * Extrae el payload real del evento
   * Los eventos de Core Hub tienen estructura: { messageId, timestamp, payload: {...}, destination, routingKey }
   * Los eventos directos tienen los datos directamente en cuerpo
   */
  private extractPayload(cuerpo: any): any {
    // Si tiene payload, usarlo (Core Hub)
    if (cuerpo.payload && typeof cuerpo.payload === 'object') {
      return cuerpo.payload;
    }
    
    // Si no, usar el cuerpo directamente (webhook directo)
    return cuerpo;
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

