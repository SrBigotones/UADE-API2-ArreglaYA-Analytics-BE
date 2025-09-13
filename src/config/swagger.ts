import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ArreglaYA Analytics API',
      version: '1.0.0',
      description: 'API para el sistema de analytics y métricas de ArreglaYA',
      contact: {
        name: 'ArreglaYA Team',
        email: 'dev@arreglaya.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: config.coreHub.url,
        description: 'Core Hub'
      }
    ],
    components: {
      schemas: {
        Event: {
          type: 'object',
          required: ['squad', 'topico', 'evento', 'cuerpo'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único del evento'
            },
            squad: {
              type: 'string',
              maxLength: 100,
              description: 'Squad responsable del evento',
              example: 'Usuarios y Roles'
            },
            topico: {
              type: 'string',
              maxLength: 100,
              description: 'Tópico del evento',
              example: 'User Management'
            },
            evento: {
              type: 'string',
              maxLength: 100,
              description: 'Tipo de evento',
              example: 'Usuario Creado'
            },
            cuerpo: {
              type: 'object',
              description: 'Datos del evento',
              example: { userId: '123', email: 'user@example.com' }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del evento'
            },
            processed: {
              type: 'boolean',
              description: 'Si el evento fue procesado',
              default: false
            }
          }
        },
        Metric: {
          type: 'object',
          required: ['name', 'value', 'unit', 'period'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único de la métrica'
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Nombre de la métrica',
              example: 'total_users'
            },
            value: {
              type: 'number',
              description: 'Valor de la métrica',
              example: 1250
            },
            unit: {
              type: 'string',
              maxLength: 50,
              description: 'Unidad de medida',
              example: 'count'
            },
            period: {
              type: 'string',
              maxLength: 50,
              description: 'Período de la métrica',
              example: 'daily'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp de la métrica'
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales'
            }
          }
        },
        WebhookPayload: {
          type: 'object',
          required: ['queue', 'event'],
          properties: {
            queue: {
              type: 'string',
              description: 'Cola del webhook',
              example: 'user-events'
            },
            event: {
              $ref: '#/components/schemas/EventMessage'
            }
          }
        },
        EventMessage: {
          type: 'object',
          required: ['squad', 'topico', 'evento', 'cuerpo'],
          properties: {
            squad: {
              type: 'string',
              example: 'Usuarios y Roles'
            },
            topico: {
              type: 'string',
              example: 'User Management'
            },
            evento: {
              type: 'string',
              example: 'Usuario Creado'
            },
            cuerpo: {
              type: 'object',
              example: { userId: '123', email: 'user@example.com' }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        UserMetrics: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number', example: 1500 },
            activeUsers: { type: 'number', example: 850 },
            newUsersToday: { type: 'number', example: 25 },
            newUsersThisWeek: { type: 'number', example: 180 },
            newUsersThisMonth: { type: 'number', example: 720 }
          }
        },
        ServiceMetrics: {
          type: 'object',
          properties: {
            totalServices: { type: 'number', example: 450 },
            activeServices: { type: 'number', example: 380 },
            servicesByCategory: { 
              type: 'object',
              example: { 'Plomería': 120, 'Electricidad': 95, 'Limpieza': 85 }
            },
            averageRating: { type: 'number', example: 4.2 }
          }
        },
        RequestMetrics: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number', example: 2500 },
            pendingRequests: { type: 'number', example: 45 },
            completedRequests: { type: 'number', example: 2200 },
            cancelledRequests: { type: 'number', example: 255 },
            averageResponseTime: { type: 'number', example: 2.5 }
          }
        },
        PaymentMetrics: {
          type: 'object',
          properties: {
            totalPayments: { type: 'number', example: 1800 },
            successfulPayments: { type: 'number', example: 1750 },
            failedPayments: { type: 'number', example: 50 },
            totalRevenue: { type: 'number', example: 125000.50 },
            averagePaymentAmount: { type: 'number', example: 71.43 }
          }
        },
        ProviderMetrics: {
          type: 'object',
          properties: {
            totalProviders: { type: 'number', example: 320 },
            activeProviders: { type: 'number', example: 280 },
            averageProviderRating: { type: 'number', example: 4.1 },
            topRatedProviders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  providerId: { type: 'string', example: 'prov-123' },
                  rating: { type: 'number', example: 4.9 },
                  totalReviews: { type: 'number', example: 156 }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', example: 'Detailed error description' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
