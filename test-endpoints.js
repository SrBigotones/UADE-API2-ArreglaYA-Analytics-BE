/**
 * Script de prueba para endpoints de metricas con filtros de segmentacion
 * 
 * Uso: 
 *   node test-endpoints.js [baseUrl] [token]
 *   O: AUTH_TOKEN=tu_token node test-endpoints.js
 * 
 * Ejemplos:
 *   node test-endpoints.js http://localhost:3000
 *   node test-endpoints.js http://localhost:3000 tu_token_aqui
 *   $env:AUTH_TOKEN="tu_token"; node test-endpoints.js
 * 
 * NOTA: Los endpoints requieren autenticacion. Opciones:
 * 1. Proporcionar un token valido como segundo argumento o variable de entorno AUTH_TOKEN
 * 2. Activar el feature flag 'bypass_auth_service' en la base de datos
 * 3. Usar un token de administrador valido del sistema de autenticacion
 */

const axios = require('axios');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.argv[3] || null;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, description) {
  try {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Testing: ${name}`, 'blue');
    log(`URL: ${url}`, 'yellow');
    log(`Description: ${description}`, 'yellow');
    log(`${'='.repeat(60)}`, 'cyan');
    
    const config = {
      timeout: 10000,
      headers: {}
    };
    
    if (AUTH_TOKEN) {
      config.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      log('Using authentication token', 'yellow');
    } else {
      log('No token provided - trying without auth (bypass may be enabled)', 'yellow');
    }
    
    const response = await axios.get(url, config);
    
    if (response.data.success) {
      log('✓ SUCCESS', 'green');
      log(`Response:`, 'green');
      console.log(JSON.stringify(response.data, null, 2));
      return true;
    } else {
      log('✗ FAILED - Response success is false', 'red');
      console.log(JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    log('✗ ERROR', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      if (error.response.status === 401) {
        log('⚠️  AUTHENTICATION REQUIRED', 'yellow');
        log('Este endpoint requiere autenticacion. Opciones:', 'yellow');
        log('  1. Proporcionar token: node test-endpoints.js http://localhost:3000 tu_token', 'yellow');
        log('  2. Activar bypass: UPDATE feature_flags SET enabled = true WHERE flag_name = \'bypass_auth_service\';', 'yellow');
        log('  3. Usar variable de entorno: $env:AUTH_TOKEN="tu_token"; node test-endpoints.js', 'yellow');
      }
      log(`Response:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log('No response received', 'red');
      log(`Error: ${error.message}`, 'red');
    } else {
      log(`Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function runTests() {
  log('\n🚀 INICIANDO PRUEBAS DE ENDPOINTS DE METRICAS', 'cyan');
  log(`Base URL: ${BASE_URL}`, 'yellow');
  if (AUTH_TOKEN) {
    log(`Using authentication token: ${AUTH_TOKEN.substring(0, 20)}...`, 'yellow');
  } else {
    log('No authentication token - endpoints may require auth or bypass flag', 'yellow');
  }
  log('');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // ========== CATALOGO DE SERVICIOS Y PRESTADORES ==========
  log('\n📦 CATALOGO DE SERVICIOS Y PRESTADORES', 'cyan');
  
  results.total++;
  if (await testEndpoint(
    'Mapa de calor de pedidos',
    `${BASE_URL}/api/metrica/solicitudes/mapa-calor?period=ultimos_30_dias`,
    'Mapa de calor sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Mapa de calor con filtros',
    `${BASE_URL}/api/metrica/solicitudes/mapa-calor?period=ultimos_30_dias&rubro=Plomeria&zona=Palermo`,
    'Mapa de calor con rubro y zona'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Distribucion de servicios',
    `${BASE_URL}/api/metrica/prestadores/servicios/distribucion?period=ultimos_30_dias`,
    'Distribucion sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Distribucion de servicios con filtros',
    `${BASE_URL}/api/metrica/prestadores/servicios/distribucion?period=ultimos_30_dias&zona=Palermo`,
    'Distribucion con zona'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Win Rate',
    `${BASE_URL}/api/metrica/prestadores/win-rate-rubro?period=ultimos_30_dias`,
    'Win Rate (no acepta filtros)'
  )) results.passed++; else results.failed++;

  // ========== APP DE BUSQUEDA Y SOLICITUDES ==========
  log('\n🔍 APP DE BUSQUEDA Y SOLICITUDES', 'cyan');
  
  results.total++;
  if (await testEndpoint(
    'Solicitudes creadas',
    `${BASE_URL}/api/metrica/solicitudes/volumen?period=ultimos_7_dias`,
    'Volumen sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Solicitudes creadas con filtros',
    `${BASE_URL}/api/metrica/solicitudes/volumen?period=ultimos_7_dias&rubro=Plomeria&zona=Palermo&tipoSolicitud=abierta`,
    'Volumen con rubro, zona y tipoSolicitud'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tasa de cancelacion',
    `${BASE_URL}/api/metrica/solicitudes/tasa-cancelacion?period=ultimos_30_dias`,
    'Tasa de cancelacion sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tiempo a primera cotizacion',
    `${BASE_URL}/api/metrica/solicitudes/tiempo-primera-cotizacion?period=ultimos_30_dias&rubro=Electricidad`,
    'Tiempo con filtro de rubro'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Conversion a cotizacion aceptada',
    `${BASE_URL}/api/metrica/matching/cotizaciones/conversion-aceptada?period=ultimos_30_dias&rubro=Plomeria`,
    'Conversion con filtro de rubro'
  )) results.passed++; else results.failed++;

  // ========== PAGOS Y FACTURACION ==========
  log('\n💳 PAGOS Y FACTURACION', 'cyan');
  
  results.total++;
  if (await testEndpoint(
    'Distribucion de eventos de pago',
    `${BASE_URL}/api/metrica/pagos/distribucion-eventos?period=ultimos_30_dias`,
    'Distribucion eventos sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Distribucion de eventos con filtros',
    `${BASE_URL}/api/metrica/pagos/distribucion-eventos?period=ultimos_30_dias&metodo=tarjeta&minMonto=1000`,
    'Distribucion eventos con metodo y minMonto'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tasa de exito de pagos',
    `${BASE_URL}/api/metrica/pagos/tasa-exito?period=ultimos_7_dias&metodo=tarjeta&rubro=Plomeria`,
    'Tasa de exito con metodo y rubro'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tiempo de procesamiento',
    `${BASE_URL}/api/metrica/pagos/tiempo-procesamiento?period=ultimos_30_dias&metodo=transferencia`,
    'Tiempo procesamiento con metodo'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Distribucion metodos de pago',
    `${BASE_URL}/api/metrica/pagos/distribucion-metodos?period=ultimos_30_dias&zona=Palermo`,
    'Distribucion metodos con zona'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Ingreso bruto y ticket medio',
    `${BASE_URL}/api/metrica/pagos/ingreso-ticket?period=ultimos_30_dias&rubro=Plomeria&minMonto=5000`,
    'Ingreso y ticket con rubro y minMonto'
  )) results.passed++; else results.failed++;

  // ========== USUARIOS & ROLES ==========
  log('\n👥 USUARIOS & ROLES', 'cyan');
  
  results.total++;
  if (await testEndpoint(
    'Distribucion por rol',
    `${BASE_URL}/api/metrica/usuarios/distribucion-por-rol`,
    'Distribucion historica (sin periodo)'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Nuevos usuarios registrados',
    `${BASE_URL}/api/metrica/usuarios/nuevos-prestadores?period=ultimos_30_dias`,
    'Nuevos usuarios prestadores sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Nuevos clientes',
    `${BASE_URL}/api/metrica/usuarios/nuevos-clientes?period=ultimos_7_dias`,
    'Nuevos clientes sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Nuevos prestadores',
    `${BASE_URL}/api/metrica/prestadores/nuevos-registrados?period=ultimos_30_dias&rubro=Plomeria`,
    'Nuevos prestadores con rubro'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tasa de usuarios inactivos',
    `${BASE_URL}/api/metrica/usuarios/tasa-roles-activos?period=ultimos_30_dias`,
    'Tasa inactivos sin filtros'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Total de usuarios',
    `${BASE_URL}/api/metrica/usuarios/totales`,
    'Total historico (sin periodo)'
  )) results.passed++; else results.failed++;

  // ========== MATCHING Y AGENDA ==========
  log('\n🤝 MATCHING Y AGENDA', 'cyan');
  
  results.total++;
  if (await testEndpoint(
    'Tiempo promedio de matching',
    `${BASE_URL}/api/metrica/matching/tiempo-promedio?period=ultimos_30_dias&rubro=Electricidad`,
    'Tiempo matching con rubro'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Cotizaciones pendientes',
    `${BASE_URL}/api/metrica/matching/cotizaciones/pendientes?period=ultimos_7_dias&zona=Palermo`,
    'Cotizaciones pendientes con zona'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tiempo de respuesta del prestador',
    `${BASE_URL}/api/metrica/matching/prestadores/tiempo-respuesta?period=ultimos_30_dias&rubro=Plomeria`,
    'Tiempo respuesta con rubro'
  )) results.passed++; else results.failed++;
  
  results.total++;
  if (await testEndpoint(
    'Tasa de cotizaciones expiradas',
    `${BASE_URL}/api/metrica/matching/cotizaciones/tasa-expiracion?period=ultimos_30_dias&zona=Palermo`,
    'Tasa expiradas con zona'
  )) results.passed++; else results.failed++;

  // ========== RESUMEN ==========
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 RESUMEN DE PRUEBAS', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total de pruebas: ${results.total}`, 'yellow');
  log(`✓ Exitosas: ${results.passed}`, 'green');
  log(`✗ Fallidas: ${results.failed}`, 'red');
  log(`Porcentaje de exito: ${((results.passed / results.total) * 100).toFixed(2)}%`, 
      results.failed === 0 ? 'green' : 'yellow');
  log('='.repeat(60) + '\n', 'cyan');
}

// Ejecutar las pruebas
runTests().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  process.exit(1);
});

