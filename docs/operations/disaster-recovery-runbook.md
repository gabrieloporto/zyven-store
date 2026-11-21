# Manual de Recuperación ante Desastres y Backups — Zyven Store (Sección 17)

## 1. Configuración Obligatoria en GitHub Secrets

Para que el workflow diario [backup-db.yml](file:///c:/Programacion/zyven-store/.github/workflows/backup-db.yml) funcione en **GitHub → Settings → Secrets and variables → Actions**, debés crear 2 secretos:

1. **`SUPABASE_DB_URL`:**
   - En tu proyecto de Supabase (`rtvbaievydfsazpefnum`), ir a **Connect → Session pooler** y copiar la URI (`postgresql://postgres.rtvbaievydfsazpefnum:[TU-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`).
   - *Importante:* Usar siempre **Session pooler** (IPv4) y no *Direct connection* (IPv6-only en el plan gratuito), porque los runners de GitHub Actions operan sobre IPv4.
2. **`BACKUP_ENCRYPTION_KEY`:**
   - Una frase secreta fuerte de al menos 24–32 caracteres guardada en tu gestor de contraseñas. Sin esta clave el archivo `.sql.enc` no puede descifrarse.

## 2. Qué se respalda y cómo se cifra (RPO ≤ 24 h)

- **Base de datos PostgreSQL (`esquema public`):** Exportada con `pg_dump` v17 (`--no-owner --no-acl`).
- **Cifrado autenticado:** `AES-256-GCM` con derivación `PBKDF2-SHA256` (120.000 iteraciones) y verificación inmediata de descifrado + hash `SHA-256` antes de eliminar el SQL en texto plano.
- **Almacenamiento ($0, sin Cloudflare R2):** Artefacto privado de GitHub Actions con retención de **30 días**.

## 3. Procedimiento de Restauración

1. Descargar el artefacto `zyven-encrypted-db-backup-<run_id>` desde la pestaña **Actions** de GitHub.
2. Descifrar con Node.js usando `BACKUP_ENCRYPTION_KEY`:
   ```bash
   node -e '
     const fs = require("fs");
     const crypto = require("crypto");
     const buf = fs.readFileSync("zyven-db-FECHA.sql.enc");
     const key = crypto.pbkdf2Sync(process.env.BACKUP_ENCRYPTION_KEY, buf.subarray(9, 25), 120000, 32, "sha256");
     const dec = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(25, 37));
     dec.setAuthTag(buf.subarray(37, 53));
     fs.writeFileSync("restore.sql", Buffer.concat([dec.update(buf.subarray(53)), dec.final()]));
   '
   ```
3. Restaurar en PostgreSQL:
   ```bash
   psql "$TARGET_DATABASE_URL" -f restore.sql
   ```
