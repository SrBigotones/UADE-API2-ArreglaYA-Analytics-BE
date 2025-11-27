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
 * Para producción considerar:
 * - Implementar cache de direcciones geocodificadas
 * - Usar servicio de geocodificación comercial (Google Maps, Mapbox, etc.)
 * - Implementar queue de geocodificación en background
 */
export class GeocodingService {
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private static readonly DEFAULT_COORDS = { lat: -34.6037, lon: -58.3816 }; // Buenos Aires centro
  private static readonly TIMEOUT_MS = 3000; // 3 segundos timeout
  
  /**
   * Cache simple en memoria para evitar geocodificar la misma dirección múltiples veces
   * En producción esto debería estar en Redis o similar
   */
  private static cache: Map<string, GeocodingResult> = new Map();

  /**
   * Construye una dirección legible desde el objeto de dirección
   */
  private static buildAddressString(direccion: DireccionData): string {
    const parts: string[] = [];
    
    if (direccion.calle) {
      parts.push(direccion.calle);
    }
    if (direccion.numero) {
      parts.push(direccion.numero);
    }
    if (direccion.ciudad) {
      parts.push(direccion.ciudad);
    }
    if (direccion.provincia) {
      parts.push(direccion.provincia);
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
      
      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: addressString,
          format: 'json',
          limit: 1,
          countrycodes: 'ar', // Limitar a Argentina
        },
        headers: {
          'User-Agent': 'ArreglaYA-Analytics/1.0'
        },
        timeout: this.TIMEOUT_MS
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const coords: GeocodingResult = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          success: true
        };
        
        // Guardar en cache
        this.cache.set(addressString, coords);
        
        logger.info(`✅ Geocoded: "${addressString}" -> [${coords.lat}, ${coords.lon}]`);
        return coords;
      } else {
        logger.warn(`⚠️ No geocoding results for: ${addressString}, using default`);
        return { ...this.DEFAULT_COORDS, success: false };
      }
    } catch (error) {
      logger.error(`❌ Geocoding error for "${addressString}":`, error);
      return { ...this.DEFAULT_COORDS, success: false };
    }
  }

  /**
   * Geocodifica múltiples direcciones en batch
   * Implementa delay entre requests para respetar rate limit de Nominatim (1 req/sec)
   */
  public static async geocodeBatch(direcciones: Array<DireccionData | null>): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];
    
    for (let i = 0; i < direcciones.length; i++) {
      const result = await this.geocode(direcciones[i]);
      results.push(result);
      
      // Delay de 1 segundo entre requests (respeto a rate limit de Nominatim)
      // Solo si no es el último elemento
      if (i < direcciones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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

