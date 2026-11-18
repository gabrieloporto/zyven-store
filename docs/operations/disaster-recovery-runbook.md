# Manual de Recuperación ante Desastres y Backups — Zyven Store (Sección 17)

## 1. Alcance y Objetivo (RPO ≤ 24 horas)

Dado que Zyven Store utiliza inicialmente el **Plan Gratuito de Supabase** ($0/mes, el cual no ofrece backups descargables de plataforma ni Point-in-Time Recovery) y **Cloudflare R2 fue descartado**, el respaldo se realiza de manera automatizada y sin costos recurrentes mediante GitHub Actions (`.github/workflows/backup-db.yml`) y utilidades criptográficas (`src/lib/backup/crypto-archive.ts`).

### ¿Qué se respalda?
1. **Base de datos PostgreSQL (`esquema public` completo):** Catálogo, variantes, niveles y movimientos de inventario, órdenes, snapshots de ítems, pagos, reembolsos, metadatos de facturación, devoluciones y auditoría (`audit_logs`).
2. **Archivos privados de Supabase Storage (`billing-documents` y `return-evidence`):** Los comprobantes PDF emitidos nunca se sobrescriben y su hash `file_sha256` queda registrado en `public.billing_documents`.

### ¿Dónde se almacena y cómo se cifra?
- Todo backup se cifra antes de abandonar el entorno de ejecución mediante **AES-256-GCM autenticado** con derivación de clave **PBKDF2-SHA256 (120.000 iteraciones)** usando el secreto `BACKUP_ENCRYPTION_KEY`.
- Se almacena como **GitHub Actions Artifact privado** con retención de **30 días** (nunca se comitea en el repositorio Git ni se expone públicamente).

### Limitaciones documentadas del Plan Gratuito
- **Ventana de pérdida máxima (RPO):** Hasta 24 horas entre ejecuciones automáticas diarias (se recomienda disparar manualmente el workflow `Backup Diario Cifrado` tras jornadas de alto volumen o cargas masivas de facturación).
- **Credenciales de Auth (`auth.users`):** Las contraseñas hasheadas en `auth.users` pueden incluirse agregando `--schema=auth` al `pg_dump` con la cadena de conexión de pooler en modo sesión.

## 2. Procedimiento de Restauración Verificado

1. Descargar el artefacto cifrado `.sql.enc` desde la pestaña **Actions → Backup Diario Cifrado** de GitHub.
2. Descifrar y verificar autenticidad localmente:
   ```bash
   openssl enc -d -aes-256-gcm -pbkdf2 -iter 120000 \
     -in zyven-db-FECHA.sql.enc \
     -out restore.sql \
     -pass env:BACKUP_ENCRYPTION_KEY
   ```
3. Aplicar sobre la instancia PostgreSQL destino:
   ```bash
   psql "$TARGET_DATABASE_URL" -f restore.sql
   ```
4. Verificar conteo de órdenes, cuadratura de `inventory_levels` (`on_hand >= reserved`) y hashes SHA-256 de `billing_documents`.
