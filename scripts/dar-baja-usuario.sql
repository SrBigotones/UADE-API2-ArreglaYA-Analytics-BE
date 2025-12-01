-- Consulta SQL para dar de baja un usuario
-- Usuario: id=97, id_usuario=27, rol=CLIENTE

-- Opción 1: Usando el id de la tabla usuarios
UPDATE usuarios 
SET estado = 'baja', 
    timestamp = NOW()
WHERE id = 97 
  AND id_usuario = 27;

-- Opción 2: Usando solo id_usuario (si hay múltiples registros con el mismo id_usuario)
-- UPDATE usuarios 
-- SET estado = 'baja', 
--     timestamp = NOW()
-- WHERE id_usuario = 27 
--   AND rol = 'CLIENTE';

-- Verificar el cambio
SELECT id, id_usuario, rol, estado, timestamp, ubicacion, created_at, updated_at
FROM usuarios 
WHERE id = 97;




