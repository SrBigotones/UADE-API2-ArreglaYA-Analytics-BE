import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { Usuario } from '../models/Usuario';
import { Servicio } from '../models/Servicio';
import { Solicitud } from '../models/Solicitud';
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
      // 3. Cotización aceptada: evento específico search.cotizacion.aceptada
      else if (topico === 'cotizacion' && evento.includes('aceptada')) {
        logger.info(`✅ Processing COTIZACION ACEPTADA event`);
        await this.processCotizacionAceptadaEvent(event);
      }
      // 4. Solicitudes: topico = 'solicitud' o evento contiene 'solicitud'/'request'
      else if (topico === 'solicitud' || evento.includes('solicitud') || evento.includes('request') || evento.includes('pedido') || evento.includes('order')) {
        logger.info(`� Processing SOLICITUD event`);
        await this.processRequestEvent(event);
      }
      // 5. Pagos: topico = 'pago' (matching.pago.emitida)
      else if (topico === 'pago') {
        logger.info(`💰 Processing PAGO event from matching`);
        await this.processPaymentEvent(event);
      }
      // 6. Prestadores: topico = 'prestador' o eventos de prestador
      else if (topico === 'prestador' || (evento.includes('prestador') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion')))) {
        logger.info(`👨‍🔧 Processing PRESTADOR event`);
        await this.processPrestadorEvent(event);
      }
      // 7. Rubros: topico = 'rubro' o eventos de rubro
      else if (topico === 'rubro' || (evento.includes('rubro') && (evento.includes('alta') || evento.includes('baja') || evento.includes('modificacion')))) {
        logger.info(`📋 Processing RUBRO event`);
        await this.processRubroEvent(event);
      }
      // 8. Zonas (NO procesamos habilidades como eventos independientes)
      else if (topico === 'zona' || evento.includes('zona') || evento.includes('zone')) {
        logger.info(`🗺️ Processing ZONE event`);
        await this.processZoneEvent(event);
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

    // Caso especial: Usuario dado de baja
    if (evento.includes('deactivated') || evento.includes('baja')) {
      const currentTimestamp = new Date();
      await usuarioRepo.update(
        { id_usuario: idUsuario },
        { 
          estado: 'baja', 
          fecha_baja: currentTimestamp  // ✅ Registrar fecha de baja
        }
      );
      logger.info(`✅ Usuario ${idUsuario} marcado como BAJA en fecha ${currentTimestamp.toISOString()}`);
    } else {
      // Para eventos de creación/actualización, hacer upsert completo
      await usuarioRepo.upsert(
        {
          id_usuario: idUsuario,
          rol: rol,
          estado: estado,
          ubicacion: ubicacion || null,
        },
        ['id_usuario']
      );
      logger.info(`✅ Usuario ${idUsuario} saved to DB`);
    }
  }

  /**
   * Procesa eventos de zonas
   * Eventos: zona.alta, zona.baja
   * NOTA: NO procesamos habilidades como eventos independientes, solo cuando vienen en prestador.modificacion/alta
   */
  private async processZoneEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const zonaRepo = AppDataSource.getRepository(Zona);

    const evento = event.evento.toLowerCase();

    // Procesar zona individual (catalogue.zona.alta/baja)
    // En estos eventos, NO viene id_usuario porque son eventos de catálogo
    // Las zonas se asocian a usuarios en prestador.modificacion/alta
    const idZona = this.extractBigInt(payload.zonaId || payload.zoneId || payload.id_zona || payload.id);
    const nombreZona = payload.nombre || payload.name || payload.zona || payload.zone || 'unknown';

    if (idZona) {
      // IGNORADO: Eventos de catálogo de zonas (catalogue.zona.alta/baja)
      // Similar a habilidades, tenemos las zonas desnormalizadas.
      // Solo procesamos zonas cuando vienen asociadas a prestadores en prestador.modificacion/alta
      // La tabla 'zonas' requiere (id_usuario, id_zona) y es una tabla de asociación, no catálogo.
      logger.debug(`Zona ${idZona} (${nombreZona}) from catalogue - will be associated to users via prestador events`);
    }
  }

  /**
   * Procesa eventos de solicitudes
   * Eventos: solicitud.creada, solicitud.cancelada, pedido_finalizado, pedido_cancelado
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
    const idHabilidad = this.extractBigInt(
      payload.habilidadId || payload.habilidad_id || payload.skillId || payload.id_habilidad
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

    // Detectar si es evento de prestador asignado
    const esPrestadorAsignado = evento.includes('prestadorasignado') || evento.includes('asignado');

    // Extraer zona de diferentes estructuras posibles
    let zona = null;
    if (payload.direccion) {
      // direccion puede ser objeto (con ciudad/provincia) o string
      if (typeof payload.direccion === 'object') {
        zona = payload.direccion.ciudad || payload.direccion.provincia;
      } else if (typeof payload.direccion === 'string') {
        zona = payload.direccion; // Usar el string directamente
      }
    } else {
      zona = payload.zona || payload.location || payload.ciudad || payload.provincia;
    }

    const esCritica = payload.urgency === 'high' || 
                      payload.es_critica === true || 
                      payload.critica === true ||
                      payload.es_urgente === true;

    // NORMALIZACIÓN DE ZONA: intentar matchear con catálogo
    if (zona) {
      const zonaRepo = AppDataSource.getRepository(Zona);
      
      // Buscar zona por nombre (case-insensitive, trim espacios)
      const zonaNormalizada = zona.trim();
      const zonaMatch = await zonaRepo
        .createQueryBuilder('z')
        .where('LOWER(z.nombre_zona) = LOWER(:zona)', { zona: zonaNormalizada })
        .getOne();
      
      if (zonaMatch) {
        zona = zonaMatch.nombre_zona;
        logger.debug(`✅ Zona normalizada: "${zonaNormalizada}" -> "${zonaMatch.nombre_zona}"`);
      } else {
        logger.warn(`⚠️ Zona "${zonaNormalizada}" no encontrada en catálogo. Usando valor original.`);
      }
    }

    // Si no viene zona pero hay prestador asignado, intentar inferir del prestador
    if (!zona && idPrestador) {
      const zonaRepo = AppDataSource.getRepository(Zona);
      const prestadorZona = await zonaRepo
        .createQueryBuilder('z')
        .where('z.id_usuario = :idPrestador', { idPrestador })
        .andWhere('z.activa = true')
        .getOne();
      
      if (prestadorZona) {
        zona = prestadorZona.nombre_zona;
        logger.debug(`📍 Zona inferida del prestador ${idPrestador}: ${zona}`);
      }
    }

    logger.info(`💾 Saving solicitud | id: ${idSolicitud} | usuario: ${idUsuario} | estado: ${estado} | zona: ${zona || 'NULL'} | habilidad: ${idHabilidad || 'NULL'} | prestador_asignado: ${esPrestadorAsignado}`);

    await solicitudRepo.upsert(
      {
        id_solicitud: idSolicitud,
        id_usuario: idUsuario,
        id_prestador: idPrestador || null,
        id_habilidad: idHabilidad || null,
        estado: estado,
        zona: zona || null,
        es_critica: esCritica || false,
        prestador_asignado: esPrestadorAsignado || !!idPrestador, // true si es evento de asignación O si viene id_prestador
      },
      ['id_solicitud'] // Conflict target: unique constraint en id_solicitud
    );

    logger.info(`✅ Solicitud ${idSolicitud} saved`);
  }

  /**
   * Procesa evento de cotización aceptada
   * Evento: search.cotizacion.aceptada
   * 
   * Cuando se acepta una cotización, actualizamos la solicitud asociada:
   * - estado = 'aceptada'
   * - fecha_confirmacion = timestamp actual (momento del match confirmado)
   */
  private async processCotizacionAceptadaEvent(event: Event): Promise<void> {
    const cuerpo = event.cuerpo;
    const payload = this.extractPayload(cuerpo);
    const solicitudRepo = AppDataSource.getRepository(Solicitud);

    const evento = event.evento.toLowerCase();
    logger.info(`✅ Processing cotización aceptada event | eventId: ${event.id}`);

    // Extraer ID de solicitud de la cotización aceptada
    const idSolicitud = this.extractBigInt(
      payload.requestId || 
      payload.solicitudId || 
      payload.id_solicitud || 
      payload.solicitud_id ||
      payload.orderId || 
      payload.pedidoId
    );

    if (!idSolicitud) {
      logger.warn(`❌ No se pudo extraer id_solicitud del evento de cotización aceptada ${event.id}`);
      logger.warn(`   squad: ${event.squad} | topico: ${event.topico} | evento: ${event.evento}`);
      logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
      return;
    }

    // Verificar que la solicitud exista
    const solicitudExistente = await solicitudRepo.findOne({ where: { id_solicitud: idSolicitud } });
    
    if (!solicitudExistente) {
      logger.warn(`⚠️ Solicitud ${idSolicitud} no encontrada para actualizar con cotización aceptada`);
      return;
    }

    // Actualizar solicitud con estado 'aceptada' y fecha_confirmacion
    const currentTimestamp = new Date();
    
    await solicitudRepo.update(
      { id_solicitud: idSolicitud },
      { 
        estado: 'aceptada',
        fecha_confirmacion: currentTimestamp
      }
    );

    logger.info(`✅ Solicitud ${idSolicitud} actualizada | estado: aceptada | fecha_confirmacion: ${currentTimestamp.toISOString()}`);
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

    // CASO ESPECIAL: matching.pago.emitida tiene estructura diferente con subobjeto "pago"
    // IMPORTANTE: Matching NO envía un ID de pago único, solo idCorrelacion (tracking del Core Hub)
    // Usamos id_solicitud como clave porque múltiples intentos de pago se hacen para la misma solicitud
    // Cuando payments cree el pago real con paymentId, se vinculará por id_solicitud
    if (evento === 'emitida' && payload.pago) {
      logger.info(`💰 Processing matching.pago.emitida - orden de pago pendiente`);
      const pagoData = payload.pago;
      
      const idSolicitud = this.extractBigInt(pagoData.idSolicitud);
      const idUsuario = this.extractBigInt(pagoData.idUsuario);
      const idPrestador = this.extractBigInt(pagoData.idPrestador);
      const montoTotal = this.extractDecimal(pagoData.montoSubtotal);
      const moneda = pagoData.moneda || 'ARS';
      const metodo = pagoData.metodoPreferido || null;

      if (!idSolicitud || !idUsuario) {
        logger.warn(`❌ No se pudo extraer datos de matching.pago.emitida ${event.id}`);
        logger.debug(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 500)}`);
        return;
      }

      // Buscar si ya existe un pago para esta solicitud
      const existingPago = await pagoRepo.findOne({ where: { id_solicitud: idSolicitud } });

      // Usar timestamp actual en lugar del que viene en el evento
      const currentTimestamp = new Date();
      
      if (existingPago) {
        // Si ya existe un pago real de payments (con paymentId), no sobrescribir
        // Solo actualizar si el estado es pending y no tiene captured_at (es decir, aún no fue procesado por payments)
        if (existingPago.estado === 'pending' && !existingPago.captured_at) {
          logger.info(`🔄 Updating pending payment order for solicitud ${idSolicitud}`);
          
          await pagoRepo.update(
            { id: existingPago.id },
            {
              monto_total: montoTotal,
              moneda: moneda,
              metodo: metodo || existingPago.metodo,
              timestamp_actual: currentTimestamp,
            }
          );
          
          logger.info(`✅ Payment order for solicitud ${idSolicitud} updated`);
        } else {
          logger.info(`⏭️ Skipping matching event - solicitud ${idSolicitud} already has a processed payment (estado: ${existingPago.estado})`);
        }
      } else {
        // Crear un registro temporal usando un ID sintético basado en id_solicitud
        // Este ID será reemplazado cuando payments cree el pago real
        // Usamos un número muy alto (1000000000 + solicitud) para evitar colisiones con IDs reales
        const temporaryId = 1000000000 + idSolicitud;
        
        logger.info(`💾 Creating temporary payment order | solicitud: ${idSolicitud} | usuario: ${idUsuario} | monto: ${montoTotal}`);
        
        await pagoRepo.upsert(
          {
            id_pago: temporaryId,
            id_usuario: idUsuario,
            id_prestador: idPrestador || null,
            id_solicitud: idSolicitud,
            monto_total: montoTotal,
            moneda: moneda,
            metodo: metodo,
            estado: 'pending',
            timestamp_creado: currentTimestamp,
            timestamp_actual: currentTimestamp,
            captured_at: null,
            refund_id: null,
          },
          ['id_pago']
        );
        
        logger.info(`✅ Temporary payment order for solicitud ${idSolicitud} created with id ${temporaryId}`);
      }
      
      return;
    }

    // CASOS NORMALES: payments squad
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
    // Para eventos method_selected, NO determinamos estado (se preserva el existente)
    let estado: string | null = null;
    
    const isMethodSelected = evento.includes('method_selected');
    
    if (!isMethodSelected) {
      const statusField = payload.newStatus || payload.status || 'PENDING_PAYMENT';
      
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
      } else {
        estado = 'pending'; // Default fallback
      }
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

    // Usar timestamp actual en lugar del que viene en el evento
    const currentTimestamp = new Date();
    const timestampCreado = currentTimestamp;

    // Para captured_at, usar updatedAt si existe (eventos status_updated), sino usar timestamp actual
    // Solo establecer captured_at para pagos aprobados y si el estado es 'approved'
    let capturedAt = null;
    if (estado === 'approved') {
      if (payload.updatedAt && Array.isArray(payload.updatedAt)) {
        // updatedAt viene como array [year, month, day, hour, minute, second, nanosecond]
        // IMPORTANTE: Todos los datos están en UTC, usar Date.UTC() para crear la fecha correctamente
        const [year, month, day, hour, minute, second] = payload.updatedAt;
        // Crear fecha en UTC directamente (no usar new Date() que usa zona horaria local)
        capturedAt = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0));
      } else {
        capturedAt = currentTimestamp;
      }
    }

    const refundId = estado === 'refunded' 
      ? this.extractBigInt(payload.refundId || payload.id_reembolso)
      : null;

    // Buscar pago existente por id_pago O por id_solicitud (para vincular con eventos de matching)
    let existingPago = await pagoRepo.findOne({ where: { id_pago: idPago } });
    
    // Si no existe por id_pago, buscar PAGOS TEMPORALES por id_solicitud (de eventos de matching)
    // IMPORTANTE: Buscar solo pagos con ID temporal (>= 1000000000) para evitar conflictos
    if (!existingPago && idSolicitud) {
      const temporaryPayments = await pagoRepo.find({ 
        where: { 
          id_solicitud: idSolicitud,
        }
      });
      
      // Buscar específicamente el pago temporal (id_pago >= 1000000000)
      const temporaryPago = temporaryPayments.find(p => p.id_pago >= 1000000000);
      
      if (temporaryPago) {
        logger.info(`🔗 Found temporary payment ${temporaryPago.id_pago} from matching for solicitud ${idSolicitud}. Converting to real payment ${idPago}`);
        
        // Eliminar el registro temporal
        await pagoRepo.delete({ id: temporaryPago.id });
        logger.info(`🗑️ Deleted temporary payment ${temporaryPago.id_pago}, will create new one with real ID ${idPago}`);
        // existingPago permanece null para forzar creación de nuevo registro más abajo
      }
    }

    if (existingPago) {
      // Actualizar pago existente usando upsert
      // REGLAS DE ACTUALIZACIÓN DE ESTADO:
      // 1. method_selected NUNCA cambia el estado
      // 2. Estados finales (approved/rejected/expired/refunded) NO se sobrescriben con pending
      // 3. Solo status_updated puede cambiar de pending a approved/rejected/expired
      let finalEstado: string;
      
      const estadosFinales = ['approved', 'rejected', 'expired', 'refunded'];
      const esEstadoFinal = estadosFinales.includes(existingPago.estado);
      
      if (isMethodSelected) {
        // method_selected NUNCA cambia el estado, solo el método
        finalEstado = existingPago.estado;
        logger.info(`🔄 Updating pago (method_selected) | id: ${idPago} | estado: ${existingPago.estado} (preserved) | metodo: ${metodo}`);
      } else if (esEstadoFinal && estado === 'pending') {
        // NO permitir que created o cualquier evento sobrescriba un estado final con pending
        finalEstado = existingPago.estado;
        logger.warn(`⚠️ Evento '${evento}' intenta cambiar pago ${idPago} de '${existingPago.estado}' a 'pending'. Preservando estado final.`);
      } else {
        // Para otros eventos (principalmente status_updated), actualizar el estado
        finalEstado = estado !== null ? estado : existingPago.estado;
        logger.info(`🔄 Updating pago | id: ${idPago} | old_estado: ${existingPago.estado} | new_estado: ${finalEstado} | evento: ${evento}`);
      }
      
      // Si el pago existente no tiene userId pero el evento sí, actualizarlo
      const finalUserId = existingPago.id_usuario || idUsuario || null;
      
      // Usar timestamp actual en lugar del que viene en el evento
      const currentTimestamp = new Date();
      
      // Para captured_at: si el nuevo estado es approved, establecerlo; sino preservar el existente
      const finalCapturedAt = estado === 'approved' 
        ? (capturedAt || existingPago.captured_at)
        : existingPago.captured_at;
      
      await pagoRepo.upsert(
        {
          id_pago: idPago,
          id_usuario: finalUserId,
          id_prestador: idPrestador || existingPago.id_prestador,
          id_solicitud: idSolicitud || existingPago.id_solicitud,
          monto_total: montoTotal || existingPago.monto_total,
          moneda: moneda,
          metodo: metodo || existingPago.metodo,
          estado: finalEstado,
          timestamp_creado: existingPago.timestamp_creado,
          timestamp_actual: currentTimestamp,
          captured_at: finalCapturedAt,
          refund_id: refundId || existingPago.refund_id,
        },
        ['id_pago']
      );
      logger.info(`✅ Pago ${idPago} updated to estado: ${finalEstado}`);
    } else {
      // Crear nuevo pago
      // Nota: puede no tener userId si es un evento status_updated que llegó antes que created
      if (!idUsuario) {
        logger.warn(`⚠️ Creando pago ${idPago} sin userId. Evento: ${event.evento}`);
        logger.warn(`   El userId se completará cuando llegue el evento 'created'`);
      }
      
      // Si es method_selected y no existe el pago, usar estado pending por defecto
      const finalEstado = estado !== null ? estado : 'pending';
      
      // Usar timestamp actual en lugar del que viene en el evento
      const currentTimestamp = new Date();
      
      logger.info(`💾 Creating pago | id: ${idPago} | usuario: ${idUsuario || 'NULL'} | estado: ${finalEstado} | evento: ${evento}`);
      await pagoRepo.upsert(
        {
          id_pago: idPago,
          id_usuario: idUsuario || null,
          id_prestador: idPrestador || null,
          id_solicitud: idSolicitud || null,
          monto_total: montoTotal,
          moneda: moneda,
          metodo: metodo || null,
          estado: finalEstado,
          timestamp_creado: currentTimestamp,
          timestamp_actual: currentTimestamp,
          captured_at: capturedAt,
          refund_id: refundId,
        },
        ['id_pago']
      );
      logger.info(`✅ Pago ${idPago} created with estado: ${finalEstado}`);
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

    // Usar timestamp actual en lugar del que viene en el evento
    const currentTimestamp = new Date();
    
    await prestadorRepo.upsert(
      {
        id_prestador: idPrestador,
        nombre: nombre,
        apellido: apellido,
        estado: estado,
        timestamp: currentTimestamp,
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
        const habIdRubro = this.extractBigInt(hab.id_rubro || hab.rubroId || hab.categoryId);
        
        if (habId) {
          await habilidadRepo.upsert(
            {
              id_usuario: idPrestador,
              id_habilidad: habId,
              nombre_habilidad: habNombre,
              id_rubro: habIdRubro,
              activa: true,
            },
            ['id_usuario', 'id_habilidad']
          );
          logger.debug(`  ✅ Habilidad ${habId} (${habNombre}) with rubro ${habIdRubro} saved for prestador ${idPrestador}`);
        }
      }
    }

    // Procesar zonas del prestador si vienen en el payload
    if (payload.zonas && Array.isArray(payload.zonas)) {
      const zonaRepo = AppDataSource.getRepository(Zona);
      logger.info(`🗺️ Processing ${payload.zonas.length} zonas for prestador ${idPrestador}`);
      
      for (const zon of payload.zonas) {
        const zonId = this.extractBigInt(zon.id || zon.id_zona || zon.zonaId);
        const zonNombre = zon.nombre || zon.name || 'unknown';
        
        if (zonId) {
          await zonaRepo.upsert(
            {
              id_usuario: idPrestador,
              id_zona: zonId,
              nombre_zona: zonNombre,
              activa: true,
            },
            ['id_usuario', 'id_zona']
          );
          logger.debug(`  ✅ Zona ${zonId} (${zonNombre}) saved for prestador ${idPrestador}`);
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

