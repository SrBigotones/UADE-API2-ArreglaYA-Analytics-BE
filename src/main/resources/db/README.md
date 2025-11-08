# Sistema de Migraciones de Base de Datos

Este directorio contiene las migraciones de esquema de la base de datos.

## Estructura

```
db/
├── migration/     # Migraciones de esquema (V1__, V2__, etc.)
└── seed/          # Directorio vacío (ya no se usan seeds SQL)
```

## Migraciones de Esquema

Las migraciones se ejecutan automáticamente al iniciar la aplicación y siguen el formato de Flyway:

- **V1__Create_events_table.sql** - Crea la extensión UUID y la tabla de eventos
- **V2__Create_metrics_table.sql** - Crea la tabla de métricas  
- **V3__Create_normalized_tables.sql** - Crea tablas normalizadas del core-hub
- **V4__Create_prestadores_rubros_tables.sql** - Crea tablas de prestadores y rubros

> 💡 **Nota:** La extensión `uuid-ossp` se crea automáticamente en la primera migración (V1) para asegurar compatibilidad con diferentes versiones de PostgreSQL.

### Nomenclatura

- `V{version}__{description}.sql` - Migraciones versionadas (se ejecutan una sola vez)
- Las migraciones se rastrean en la tabla `migration_history`

## Datos de Prueba

**Los datos de prueba ya NO se inyectan mediante archivos SQL.**

En su lugar, se utiliza el **TestDataController** que expone endpoints REST para crear datos de test:

### Endpoints disponibles:

- `POST /api/test-data/events` - Crear eventos de prueba en bulk
- `DELETE /api/test-data/events/:id` - Eliminar un evento de prueba
- `DELETE /api/test-data/events/by-source` - Eliminar eventos por source
- `GET /api/test-data/events/by-source` - Obtener eventos por source

### Ventajas:

✅ Más flexible - Puedes crear exactamente los datos que necesitas  
✅ Sin reinicios - No necesitas reiniciar la aplicación  
✅ Específico por test - Cada test puede tener sus propios datos  
✅ Limpieza fácil - Puedes eliminar datos de test sin afectar datos reales  
✅ Versionado - Los datos están en el código, no en SQL estático

### Ejemplo de uso:

```bash
# Crear eventos de prueba
curl -X POST http://localhost:3000/api/test-data/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "squad": "Usuarios y Roles",
        "topico": "usuarios",
        "evento": "users.created",
        "cuerpo": {"userId": "test-123", "email": "test@example.com"}
      }
    ]
  }'
```

## Notas

- Las migraciones se ejecutan en modo desarrollo y producción
- Los datos de test solo están disponibles en entornos no productivos
- La tabla `seed_history` ya no se utiliza y puede eliminarse manualmente si existe

