import axios from 'axios';
import { logger } from '../config/logger';

interface DireccionData {
  calle?: string;
  numero?: string;
  piso?: string;
  depto?: string;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  referencia?: string;
}

interface GeocodingResult {
  lat: number;
  lon: number;
  success: boolean;
}

/**
 * Servicio de geocodificación usando Nominatim (OpenStreetMap)
 * 
 * IMPORTANTE: Nominatim tiene límites de rate (1 req/sec)
 * Implementa un semáforo simple con variable global para controlar el rate limiting
 */
export class GeocodingService {
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private static readonly DEFAULT_COORDS = { lat: -34.6037, lon: -58.3816 }; // Buenos Aires centro
  private static readonly TIMEOUT_MS = 3000; // 3 segundos timeout
  private static readonly MIN_DELAY_MS = 1100; // 1.1 segundos entre requests (margin de seguridad)
  
  /**
   * SEMÁFORO GLOBAL: Timestamp de la última geocodificación exitosa
   * Usado para asegurar que respetamos el rate limit de Nominatim (1 req/seg)
   */
  private static lastGeocodingTimestamp: number = 0;
  
  /**
   * Cache simple en memoria para evitar geocodificar la misma dirección múltiples veces
   * En producción esto debería estar en Redis o similar
   */
  private static cache: Map<string, GeocodingResult> = new Map();

  /**
   * Espera el tiempo necesario para respetar el rate limit
   * Implementa un semáforo simple usando timestamp global
   */
  private static async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGeocodingTimestamp;
    
    if (timeSinceLastRequest < this.MIN_DELAY_MS) {
      const waitTime = this.MIN_DELAY_MS - timeSinceLastRequest;
      logger.debug(`🚦 Rate limit: waiting ${waitTime}ms before next geocoding request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Actualiza el semáforo después de una geocodificación exitosa
   */
  private static updateRateLimitSemaphore(): void {
    this.lastGeocodingTimestamp = Date.now();
  }

  /**
   * Construye una dirección legible desde el objeto de dirección
   * Optimizado para Nominatim Argentina
   */
  private static buildAddressString(direccion: DireccionData): string {
    const parts: string[] = [];
    
    // Calle + Número (lo más importante)
    if (direccion.calle && direccion.numero) {
      parts.push(`${direccion.calle} ${direccion.numero}`);
    } else if (direccion.calle) {
      parts.push(direccion.calle);
    }
    
    // Ciudad/Localidad
    if (direccion.ciudad) {
      // Normalizar "Caba" a "Buenos Aires" o "Ciudad Autónoma de Buenos Aires"
      const ciudad = direccion.ciudad.toLowerCase();
      if (ciudad === 'caba' || ciudad === 'capital federal') {
        parts.push('Buenos Aires');
      } else {
        parts.push(direccion.ciudad);
      }
    }
    
    // Provincia (solo si no es CABA)
    if (direccion.provincia) {
      const provincia = direccion.provincia.toLowerCase();
      // Normalizar abreviaturas comunes
      if (provincia === 'pch' || provincia === 'bsas' || provincia === 'ba') {
        parts.push('Buenos Aires');
      } else if (provincia !== 'caba' && provincia !== 'capital federal') {
        parts.push(direccion.provincia);
      }
    }
    
    // Código postal (puede ayudar a afinar)
    if (direccion.codigo_postal) {
      parts.push(direccion.codigo_postal);
    }
    
    // Siempre agregar "Argentina" para mejorar precisión
    parts.push('Argentina');
    
    return parts.join(', ');
  }

  /**
   * Geocodifica una dirección usando Nominatim
   * Retorna coordenadas por defecto de Buenos Aires si falla
   */
  public static async geocode(direccion: DireccionData | null): Promise<GeocodingResult> {
    if (!direccion) {
      logger.debug('📍 No address provided, using default coordinates');
      return { ...this.DEFAULT_COORDS, success: false };
    }

    // Construir string de dirección
    const addressString = this.buildAddressString(direccion);
    
    // Verificar cache
    const cached = this.cache.get(addressString);
    if (cached) {
      logger.debug(`📍 Geocoding cache HIT: ${addressString}`);
      return cached;
    }

    try {
      logger.debug(`📍 Geocoding address: ${addressString}`);
      
      // SEMÁFORO: Esperar el tiempo necesario antes de hacer el request
      await this.waitForRateLimit();
      
      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: addressString,
          format: 'json',
          limit: 1,
          countrycodes: 'ar', // Limitar a Argentina
          addressdetails: 1,   // Obtener detalles de la dirección
        },
        headers: {
          'User-Agent': 'ArreglaYA-Analytics/1.0'
        },
        timeout: this.TIMEOUT_MS
      });

      // SEMÁFORO: Actualizar timestamp después del request exitoso
      this.updateRateLimitSemaphore();

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const coords: GeocodingResult = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          success: true
        };
        
        // Guardar en cache
        this.cache.set(addressString, coords);
        
        logger.info(`✅ Geocoded: "${addressString}" → [${coords.lat}, ${coords.lon}] (${result.display_name})`);
        return coords;
      } else {
        logger.warn(`⚠️ No geocoding results for: "${addressString}", using default Buenos Aires coords`);
        const defaultResult = { ...this.DEFAULT_COORDS, success: false };
        // También cachear los fallos para no reintentar
        this.cache.set(addressString, defaultResult);
        return defaultResult;
      }
    } catch (error) {
      logger.error(`❌ Geocoding error for "${addressString}":`, error instanceof Error ? error.message : error);
      const defaultResult = { ...this.DEFAULT_COORDS, success: false };
      return defaultResult;
    }
  }

  /**
   * Geocodifica múltiples direcciones en batch
   * DEPRECADO: Ahora se recomienda geocodificar al recibir eventos individuales
   * Se mantiene para compatibilidad pero ya no se usa en el mapa de calor
   */
  public static async geocodeBatch(direcciones: Array<DireccionData | null>): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];
    
    logger.warn('⚠️ geocodeBatch is deprecated. Geocoding should happen on event reception.');
    
    for (const direccion of direcciones) {
      const result = await this.geocode(direccion);
      results.push(result);
      // El rate limiting se maneja automáticamente en geocode()
    }
    
    return results;
  }

  /**
   * Limpia el cache de geocodificación
   */
  public static clearCache(): void {
    this.cache.clear();
    logger.info('🗑️ Geocoding cache cleared');
  }

  /**
   * Retorna estadísticas del cache
   */
  public static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

