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

## Notas

- Las migraciones se ejecutan en modo desarrollo y producción
- La tabla `seed_history` ya no se utiliza y puede eliminarse manualmente si existe

