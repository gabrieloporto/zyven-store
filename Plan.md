# PLANIFICACIÓN DE ZYVEN STORE

Actuá como arquitecto de software senior, especializado en e-commerce, Next.js, PostgreSQL, Supabase, integraciones de pagos y sistemas de gestión comercial.

Quiero planificar desde cero el desarrollo de **Zyven Store**, un e-commerce propio para un negocio real en Argentina.

Tu responsabilidad en esta etapa es analizar el proyecto, investigar las tecnologías y herramientas disponibles, definir una arquitectura adecuada y elaborar un roadmap técnico completo que podamos implementar progresivamente.

**IMPORTANTE: Estamos en Plan Mode. No escribas código, no instales dependencias, no ejecutes migraciones y no modifiques archivos. Primero quiero revisar y aprobar el plan.**

Este prompt es la fuente de verdad para las decisiones del proyecto. No des por válidas decisiones de planes anteriores si contradicen lo establecido aquí.

---

# 1. CONTEXTO DEL NEGOCIO

Zyven Store es un comercio generalista que actualmente está comenzando su operación online.

Productos comercializados actualmente:

- Perfumes.
- Auriculares.
- Parlantes.
- Accesorios tecnológicos.
- Otros productos de tecnología.
- Indumentaria.

A futuro queremos incorporar:

- Calzado.
- Electrodomésticos.
- Artículos para el hogar.
- Otras categorías de consumo.

El objetivo es desarrollar una tienda propia, no depender exclusivamente de marketplaces o plataformas cerradas.

El negocio:

- Maneja stock propio.
- Compra, almacena y prepara sus propios productos.
- Actualmente tiene un único punto de almacenamiento.
- Comienza con aproximadamente 5-10 ventas semanales.
- Busca una solución económica que pueda acompañar el crecimiento del negocio.

**Ubicación del negocio y despacho:**

- Localidad: Alejandro Korn.
- Partido: San Vicente.
- Provincia: Buenos Aires.
- Código postal: 1864.
- País: Argentina.

La tienda debe operar inicialmente en español argentino y pesos argentinos (ARS).

---

# 2. PRINCIPIOS Y RESTRICCIONES DEL PROYECTO

Estas decisiones son fundamentales y deben respetarse durante todo el desarrollo.

### 2.1 Evitar sobreingeniería

Queremos un producto profesional, no una infraestructura empresarial innecesariamente compleja.

Preferimos:

- Monolito modular.
- Separación por dominios.
- Código reutilizable.
- TypeScript estricto.
- Lógica de negocio en servidor.
- Arquitectura mantenible.
- Integraciones desacopladas.
- Dependencias justificadas.

No queremos:

- Microservicios.
- Infraestructura distribuida innecesaria.
- Múltiples bases de datos sin justificación.
- Abstracciones genéricas que no resuelven una necesidad real.
- Dependencias adicionales solamente por preferencia tecnológica.
- Implementaciones especulativas para funcionalidades futuras.

### 2.2 Política estricta de costos

El negocio está comenzando y queremos minimizar los gastos operativos hasta alcanzar una rentabilidad y un flujo de usuarios que justifiquen nuevas inversiones.

**Únicos gastos recurrentes inicialmente autorizados:**

- Vercel para hosting y despliegue.
- Dominio registrado en Namecheap.

Vercel deberá utilizar un plan que permita expresamente el uso comercial de la tienda. Verificá sus condiciones vigentes y contemplá ese costo dentro del presupuesto autorizado.

Todos los demás servicios deberán utilizar:

- Planes gratuitos.
- Herramientas open source.
- Funcionalidades ya incluidas.
- Recursos existentes.

No contratar, activar, habilitar facturación ni realizar upgrades de servicios sin aprobación explícita.

Esto incluye, entre otros:

- Supabase Pro.
- Cloudflare R2 pago.
- Redis o Upstash.
- Servicios externos de colas.
- Plataformas adicionales de automatización.
- Servicios de backups pagos.
- Planes pagos de Sentry, PostHog o Resend.
- Productos adicionales de Vercel con facturación independiente.

Cloudflare R2 puede evaluarse como una alternativa de almacenamiento gratuito dentro de sus límites vigentes, pero no debe habilitarse ni generar cargos sin autorización.

**No sacrificar seguridad o integridad de datos por ahorrar costos.** Cuando una limitación del plan gratuito represente un riesgo, explicarla y proponer alternativas. No ocultar limitaciones ni asumir que un servicio gratuito ofrece funcionalidades de planes superiores.

Cada nueva dependencia, servicio o infraestructura propuesta deberá incluir su necesidad, alternativas gratuitas y eventual costo.

---

# 3. STACK TECNOLÓGICO DEFINIDO

Este es el stack seleccionado para el proyecto.

| Área                 | Tecnología         |
| -------------------- | ------------------ |
| Frontend             | Next.js            |
| Framework UI         | React              |
| Lenguaje             | TypeScript strict  |
| Estilos              | Tailwind CSS       |
| Componentes          | shadcn/ui          |
| Backend              | Next.js + Supabase |
| Base de datos        | PostgreSQL         |
| ORM / acceso a datos | supabase-js        |
| Autenticación        | Supabase Auth      |
| Storage              | Supabase Storage   |
| Validaciones         | Zod                |
| Pagos                | Mercado Pago       |
| Emails               | Resend             |
| Monitoreo de errores | Sentry             |
| Analítica            | PostHog            |
| Testing unitario     | Vitest             |
| Testing E2E          | Playwright         |
| Versionado           | Git + GitHub       |
| Deploy               | Vercel             |
| Dominio              | Namecheap          |
| DNS                  | Cloudflare         |

### Consideraciones tecnológicas

**Supabase:**

Utilizar:

- PostgreSQL como fuente de verdad.
- Supabase Auth.
- Supabase Storage.
- supabase-js.
- Tipos TypeScript generados desde el esquema.
- @supabase/ssr para sesiones en Next.js, verificando su API y estabilidad actual.

No incorporar Prisma, Drizzle ni otro ORM inicialmente. Si considerás que existe una necesidad técnica concreta, justificá la propuesta antes de agregarlo.

**Next.js:**

Utilizar App Router.

Evaluar correctamente:

- Server Components.
- Client Components.
- Server Actions.
- Route Handlers.
- Middleware o mecanismos de protección de rutas según las prácticas actuales del framework.

La lógica crítica de negocio debe permanecer en servidor.

**Mercado Pago:**

Utilizar Checkout Pro como primera alternativa.

Consultar documentación oficial actualizada y verificar los requisitos de integración.

**Resend, Sentry y PostHog:**

Utilizar exclusivamente sus planes gratuitos y respetar sus cuotas.

Si alguno alcanza un límite, notificarlo y proponer alternativas. Nunca realizar upgrades automáticos.

---

# 4. USO DE SKILLS, MCP Y DOCUMENTACIÓN

Antes de definir la implementación:

1. Inspeccioná todas las skills disponibles.
2. Identificá cuáles son relevantes para el proyecto.
3. Leé las skills correspondientes antes de diseñar sus integraciones.
4. Inspeccioná los MCP y conectores realmente disponibles.
5. Utilizá el MCP de Supabase para documentación, arquitectura y análisis cuando corresponda.
6. Consultá documentación oficial actualizada de Next.js, Supabase, Mercado Pago, Vercel, Resend y las demás herramientas.

No inventes MCP, herramientas, integraciones ni capacidades que no estén disponibles.

Diferenciá claramente:

- Funcionalidades incluidas en el stack.
- Funcionalidades disponibles mediante APIs oficiales.
- Funcionalidades que requieren un proveedor externo.
- Funcionalidades que requieren una suscripción paga.

Priorizá la documentación oficial sobre tutoriales desactualizados.

---

# 5. ARQUITECTURA GENERAL

Queremos un **monolito modular con Next.js App Router**.

La aplicación debe separar responsabilidades sin fragmentarse innecesariamente.

Evaluá una estructura organizada por dominios de negocio.

Módulos esperados:

- Products.
- Categories.
- Brands.
- Inventory.
- Cart.
- Checkout.
- Orders.
- Payments.
- Shipping.
- Customers.
- Billing.
- Returns.
- Notifications.
- Admin.

Proponé una estructura de carpetas concreta, explicando las responsabilidades de cada módulo.

Buscamos:

- Separación entre UI, lógica de negocio y acceso a datos.
- Tipado estricto.
- Validaciones compartidas.
- Manejo consistente de errores.
- Funciones críticas protegidas en servidor.
- Código reutilizable sin duplicaciones innecesarias.
- Fácil incorporación de nuevos módulos.

No es obligatorio crear un módulo independiente para cada concepto si una solución más sencilla resulta adecuada.

---

# 6. CATÁLOGO Y PRODUCTOS

El catálogo debe ser flexible porque la tienda incorporará categorías muy diferentes.

### Funcionalidades

- Listado de productos.
- Categorías y subcategorías.
- Marcas.
- Buscador.
- Filtros.
- Ordenamiento.
- Paginación.
- Productos destacados.
- Productos relacionados.
- Promociones.
- Página individual de producto.
- Galería de imágenes.
- SEO por producto y categoría.

### Productos y variantes

Cada producto debe poder ser simple o contener variantes comerciales.

Cada variante tendrá:

- SKU único.
- Precio.
- Precio promocional opcional.
- Stock.
- Estado de publicación.
- Opciones comerciales.
- Imágenes cuando corresponda.

Ejemplo:

Auriculares Bluetooth X:

- Negro: SKU AUR-X-BLK.
- Blanco: SKU AUR-X-WHT.
- Azul: SKU AUR-X-BLU.

Cada variante debe tener inventario independiente.

### Atributos flexibles

Evitar una estructura rígida con columnas específicas para cada categoría.

Ejemplos:

Perfumes:

- Marca.
- Fragancia.
- Volumen.
- Concentración.

Tecnología:

- Marca.
- Modelo.
- Conectividad.
- Color.
- Especificaciones.

Indumentaria:

- Talle.
- Color.
- Material.

Evaluar JSONB para atributos descriptivos y opciones comerciales flexibles cuando resulte conveniente, manteniendo normalizadas las entidades que necesitan integridad relacional.

No construir un motor de atributos excesivamente complejo para el MVP.

---

# 7. INVENTARIO Y STOCK PROPIO

El negocio maneja mercadería propia.

Necesitamos:

- Control de stock por variante.
- Registro de entradas.
- Registro de salidas.
- Ajustes manuales.
- Historial de movimientos.
- Alertas de stock bajo.
- Reservas temporales.
- Liberación de reservas vencidas.
- Prevención de ventas sin disponibilidad.

Inicialmente existe un solo depósito.

El diseño puede permitir múltiples depósitos en el futuro, pero no implementar complejidad multidepósito en el MVP.

### Integridad transaccional

Este punto es crítico.

Evitar sobreventas ante operaciones concurrentes.

Evaluar:

- Transacciones PostgreSQL.
- Bloqueos de filas.
- Operaciones atómicas.
- Constraints.
- Funciones SQL de alcance limitado.

La reserva debe verificar disponibilidad y modificar el stock de manera atómica.

Nunca confiar únicamente en el stock informado por el frontend.

### Pagos tardíos

Contemplar este escenario:

1. Se reserva una unidad.
2. La reserva vence.
3. Se libera el stock.
4. Otro usuario compra el producto.
5. Llega una notificación de pago aprobado para la primera orden.

La primera orden debe pasar a revisión manual.

No debe consumirse stock que ya pudo venderse ni habilitarse el despacho automáticamente.

La administración podrá intentar reservar stock nuevamente o gestionar el reembolso.

Todas las operaciones deben ser idempotentes.

---

# 8. CARRITO, CHECKOUT Y ÓRDENES

### Carrito

- Agregar productos.
- Eliminar productos.
- Modificar cantidades.
- Seleccionar variantes.
- Calcular subtotales.
- Aplicar descuentos cuando estén habilitados.
- Persistir el carrito.
- Sincronizar al iniciar sesión.

Permitir compras como invitado y compras mediante cuenta registrada.

Evaluar persistencia del carrito de invitado en servidor con identificador opaco y seguro.

### Checkout

El checkout debe contemplar:

- Datos del comprador.
- Nombre y apellido.
- Email.
- Teléfono.
- Dirección.
- Provincia.
- Localidad.
- Código postal.
- Método de entrega.
- Resumen de artículos.
- Descuentos.
- Costo de envío.
- Total.
- Medio de pago.

El backend siempre debe recalcular:

- Precios.
- Descuentos.
- Cantidades.
- Stock.
- Costos de envío cuando exista una integración real.

Nunca confiar en valores enviados por el navegador.

### Órdenes

Guardar:

- Identificador.
- Comprador.
- Dirección de entrega.
- Productos adquiridos.
- Variantes.
- SKU.
- Cantidades.
- Snapshot de precios.
- Descuentos.
- Subtotal.
- Envío.
- Total.
- Estado.
- Historial de eventos.

Separar los estados de:

- Orden.
- Pago.
- Preparación y cumplimiento.
- Envío.
- Facturación.

Los cambios futuros en el catálogo no deben alterar las órdenes históricas.

---

# 9. PAGOS — MERCADO PAGO

Mercado Pago será la pasarela inicial.

Implementar inicialmente Checkout Pro haciendo uso de mercadopago-mcp-server.

Contemplar:

- Creación de preferencias desde backend.
- Identificación externa de órdenes.
- Redirección.
- URLs de retorno.
- Webhooks.
- Validación de firmas conforme a documentación vigente.
- Consulta del pago real a Mercado Pago.
- Idempotencia.
- Pagos aprobados.
- Pagos pendientes.
- Pagos rechazados.
- Reembolsos.
- Pagos tardíos.
- Conciliación de operaciones.

**Una URL de retorno exitosa nunca debe utilizarse como única prueba de pago aprobado.**

El backend debe verificar el estado real del pago.

### Desarrollo y producción

Durante desarrollo y testing:

- Utilizar credenciales de sandbox.
- Probar el flujo completo.
- Simular respuestas y notificaciones.
- Probar eventos duplicados y fallos.

No utilizar credenciales productivas en ambientes de desarrollo o preview.

---

# 10. LOGÍSTICA Y ENVÍOS — PROVEEDOR PENDIENTE

Esta es una decisión comercial todavía abierta.

Estamos evaluando:

1. Zipnova.
2. Correo Argentino mediante PAQ.AR.
3. Andreani.
4. OCA.

Envíopack también fue evaluado, pero su equipo comercial indicó que su solución podría resultar demasiado robusta y costosa para nuestro volumen inicial.

**No seleccionar ni implementar un proveedor logístico todavía.**

La elección dependerá de las condiciones comerciales, tarifas, cobertura y restricciones.

### Objetivo de la futura integración

Ofrecer al comprador:

- Cotizaciones desde el checkout.
- Entrega a domicilio.
- Retiro en sucursal o punto habilitado.
- Diferentes modalidades de despacho.
- Seguimiento.
- Información de entrega.

Desde administración:

- Generar etiquetas.
- Consultar envíos.
- Gestionar despachos.
- Cancelaciones.
- Historial de seguimiento.
- Gestión de errores.

### Arquitectura desacoplada

Diseñar un contrato común para futuros proveedores.

El checkout debe comunicarse con un servicio logístico propio, no directamente con APIs específicas.

Los adaptadores concretos se implementarán únicamente cuando se seleccione un proveedor.

No crear adaptadores ficticios ni inventar tarifas.

### Embalaje y paquetes

Contemplar desde el diseño:

- Peso del producto.
- Alto.
- Ancho.
- Profundidad.
- Embalaje.
- Peso final del paquete.
- Dimensiones finales.
- Agrupamiento de varios productos.
- Múltiples paquetes por orden.
- Peso volumétrico según reglas del operador.

Guardar cotizaciones con:

- Proveedor.
- Servicio.
- Importe.
- Destino.
- Paquetes considerados.
- Identificador externo.
- Fecha de vencimiento.

Rechazar cotizaciones vencidas o que no correspondan a la dirección y carrito actuales.

### Restricciones de transporte

Actualmente vendemos perfumes que pueden contener alcohol y dispositivos electrónicos que pueden contener baterías de litio.

No asumir que todos los transportistas aceptan estos productos.

Antes de habilitar un operador, verificar mediante documentación o confirmación comercial:

- Admisión de perfumes.
- Restricciones de líquidos inflamables.
- Requisitos de embalaje.
- Restricciones de baterías.
- Coberturas de seguro.
- Condiciones ante pérdidas y daños.

El sistema podrá representar restricciones logísticas por producto y proveedor.

### Cumplimiento manual

Contemplar los siguientes modos:

- Operador logístico integrado.
- Retiro personal.
- Despacho coordinado manualmente.

Los modos manuales estarán deshabilitados inicialmente.

Solo podrán activarse desde administración una vez definidos:

- Ubicación.
- Instrucciones.
- Condiciones.
- Costos cuando correspondan.

Cuando el envío requiera una cotización manual posterior, no generar una preferencia de pago hasta tener el importe acordado y confirmado por el cliente.

### Simulador logístico

Para el desarrollo se utilizará un proveedor simulado exclusivamente en ambientes de desarrollo y testing.

Debe permitir probar el checkout sin depender de una API real.

Debe ser imposible habilitar ese simulador en producción.

---

# 11. PANEL DE ADMINISTRACIÓN

Desarrollar el panel dentro del mismo proyecto Next.js.

Protegerlo mediante roles y permisos server-side.

### Dashboard

- Ventas.
- Facturación.
- Pedidos.
- Productos más vendidos.
- Stock bajo.
- Métricas comerciales.

### Productos

- Crear y editar productos.
- Gestionar imágenes.
- Categorías.
- Marcas.
- Variantes.
- SKU.
- Precios.
- Promociones.
- Publicación.

### Inventario

- Consultar stock.
- Registrar entradas.
- Registrar salidas.
- Ajustes.
- Movimientos.
- Reservas.
- Alertas.

### Órdenes

- Listado.
- Filtros.
- Detalle.
- Estados.
- Datos del comprador.
- Artículos.
- Pagos.
- Cumplimiento.
- Información logística.

### Clientes

- Datos.
- Direcciones.
- Historial de compras.

### Pagos

- Estado.
- Identificadores.
- Eventos.
- Reembolsos.

### Envíos

- Modalidad.
- Proveedor.
- Estado.
- Etiquetas.
- Seguimiento.
- Errores.

### Facturación

- Pedidos pendientes de facturar.
- Registro de comprobantes.
- Acceso a PDF.
- Historial.

### Configuración

- Datos del negocio.
- Parámetros comerciales.
- Métodos de pago.
- Modos de cumplimiento.
- Configuración de tienda.

Inicialmente habrá un administrador principal.

Dejar preparada la incorporación futura de otros roles administrativos sin implementar un sistema excesivamente complejo.

---

# 12. FACTURACIÓN — OPERATORIA MANUAL

Actualmente el negocio todavía no tiene automatizada la emisión de facturas.

Durante el MVP:

- No integrar ARCA.
- No contratar un proveedor fiscal.
- No automatizar la emisión.

Mantener una operatoria manual desde el panel administrativo.

Cada orden deberá poder asociarse con uno o varios comprobantes.

Contemplar los campos:

- Tipo de comprobante.
- Punto de venta.
- Número.
- Fecha.
- Importe.
- Datos de identificación del receptor.
- Condición fiscal y demás información que indique el contador.
- CAE y vencimiento del CAE cuando corresponda.
- Archivo PDF.

Los datos definitivos y el procedimiento de emisión se definirán con el contador antes de habilitar ventas reales.

### Almacenamiento

Los comprobantes deben almacenarse en un bucket privado de Supabase Storage.

- Sin enlaces públicos.
- Verificación de permisos administrativos desde servidor.
- URLs firmadas de corta duración.
- Registro de documentos en PostgreSQL.
- Historial de cambios.
- No sobrescribir comprobantes emitidos.

Mantener el estado de facturación independiente del estado de pago.

Estados posibles:

- Pendiente.
- Parcialmente facturado.
- Facturado.

Las anulaciones y notas de crédito se resolverán según el procedimiento indicado por el contador.

La arquitectura podrá permitir una integración fiscal futura, pero no construirla ahora.

---

# 13. DEVOLUCIONES, CAMBIOS Y REEMBOLSOS

Contemplar un módulo administrativo de posventa.

Necesitamos:

- Solicitud de devolución.
- Productos involucrados.
- Motivo.
- Autorización.
- Recepción.
- Inspección.
- Resolución.
- Reembolso total o parcial.
- Cambio de producto.

Los cambios deben generar una nueva orden relacionada con la original cuando corresponda.

El stock devuelto solo se repone después de recibir e inspeccionar la mercadería.

Los reembolsos deben poseer estados e identificadores propios y solamente marcarse como completados tras confirmar la operación con Mercado Pago.

Registrar las operaciones administrativas importantes en una auditoría append-only.

---

# 14. AUTENTICACIÓN Y SEGURIDAD

Supabase Auth.

Contemplar:

- Registro.
- Inicio de sesión.
- Cierre de sesión.
- Recuperación de contraseña.
- Gestión de sesiones.
- Perfil.
- Direcciones.
- Roles.

Implementar:

- Row Level Security.
- Políticas de acceso por usuario.
- Roles administrativos.
- Bootstrap controlado del administrador.
- Validación server-side.
- Protección de Server Actions.
- Protección de Route Handlers.
- Rate limiting cuando sea posible sin contratar nuevos servicios.
- Validación de webhooks.
- Protección de secretos.

No utilizar user_metadata como fuente confiable de autorización.

Nunca exponer la service role key en el navegador.

Las políticas RLS deben probarse con usuarios anónimos, clientes y administradores.

No depender exclusivamente de ocultar rutas o botones para proteger funciones administrativas.

---

# 15. EMAILS — RESEND

Utilizar Resend dentro de su plan gratuito.

Contemplar:

- Confirmación de compra.
- Confirmación de pago.
- Actualización de pedidos.
- Despacho.
- Seguimiento.
- Cancelaciones.
- Reembolsos.
- Recuperación de cuenta cuando corresponda.

Diseñar plantillas reutilizables.

Evitar emails duplicados mediante idempotencia.

No introducir otros servicios de email sin justificación y aprobación.

---

# 16. OUTBOX, WEBHOOK INBOX Y PROCESOS PERIÓDICOS

Diseñar un mecanismo confiable para procesar eventos.

### Outbox

Registrar eventos junto a las transacciones correspondientes.

Contemplar:

- Eventos de órdenes.
- Pagos.
- Reembolsos.
- Emails.
- Operaciones relevantes.

### Webhook Inbox

Registrar notificaciones entrantes y deduplicarlas.

### Procesamiento

Implementar:

- Idempotencia.
- Reintentos.
- Backoff.
- Registro de errores.
- Eventos fallidos.
- Reprocesamiento administrativo.

### Scheduler

Evaluar Vercel Schedules como mecanismo de procesamiento periódico, verificando:

- Disponibilidad en el plan seleccionado.
- Frecuencias permitidas.
- Límites.
- Costos adicionales.

No incorporar otro scheduler en paralelo sin una justificación técnica.

Los eventos importantes podrán disparar un intento inmediato de procesamiento y el scheduler funcionará como mecanismo de recuperación.

Los procesos deben funcionar correctamente aunque un job se ejecute tarde o varias veces.

La expiración de reservas debe validarse mediante `expires_at` y operaciones transaccionales, sin depender de la puntualidad del scheduler para evitar sobreventas.

Si Vercel Schedules no está incluido en las condiciones presupuestadas, proponer una alternativa sin costo recurrente adicional.

---

# 17. BACKUPS Y RECUPERACIÓN

No contratar Supabase Pro ni servicios de backups pagos inicialmente.

Supabase se utilizará dentro del plan gratuito, siempre documentando sus limitaciones.

### Estrategia inicial

Evaluar:

- Exportaciones PostgreSQL mediante herramientas oficiales.
- pg_dump.
- Copias independientes de archivos Storage.
- Scripts automatizados.
- Copias manuales cuando corresponda.
- Cifrado.
- Retención configurable.
- Restauración de prueba.

Cloudflare R2 puede evaluarse como posible destino gratuito, pero no habilitarlo ni contratarlo sin autorización.

No guardar backups en el repositorio GitHub ni exponerlos públicamente.

No asumir que los backups de PostgreSQL incluyen los archivos de Storage.

### Objetivo inicial

RPO objetivo de hasta 24 horas, siempre que exista una copia reciente y verificada.

Documentar:

- Qué se respalda.
- Dónde se almacena.
- Cómo se cifra.
- Cómo se recupera.
- Cuánto tiempo de información podría perderse.
- Qué limitaciones existen con el plan gratuito.

Realizar una prueba de restauración en un entorno aislado antes de habilitar ventas reales.

No afirmar que existe una recuperación confiable si el procedimiento no fue probado.

---

# 18. MONITOREO Y ANALÍTICA

### Sentry

Utilizar el plan gratuito para:

- Excepciones.
- Errores de frontend.
- Errores de backend.
- Contexto de fallos críticos.

### PostHog

Utilizar el plan gratuito para medir:

- Product viewed.
- Search performed.
- Add to cart.
- Remove from cart.
- Checkout started.
- Payment initiated.
- Purchase completed.

No enviar:

- Contraseñas.
- Tokens.
- Datos de tarjetas.
- Credenciales.
- Datos personales innecesarios.
- Información fiscal sensible.

Respetar cuotas y límites gratuitos.

No habilitar upgrades automáticos.

---

# 19. EXPERIENCIA DE USUARIO Y DISEÑO

La tienda debe presentar una identidad visual profesional, moderna y coherente.

Requisitos:

- Español de Argentina.
- Pesos argentinos.
- Formato monetario local.
- Responsive.
- Mobile-first.
- Navegación intuitiva.
- Compra sencilla.
- Buena jerarquía visual.
- Imágenes optimizadas.
- Estados de carga.
- Estados vacíos.
- Manejo de errores.
- Accesibilidad razonable.

Utilizar shadcn/ui y Tailwind para mantener consistencia visual.

El storefront y el panel administrativo deben compartir un sistema de diseño coherente, aunque pueden tener layouts y experiencias diferentes.

No definir una identidad visual demasiado restrictiva antes de investigar y proponer una solución adecuada para una tienda generalista.

---

# 20. TESTING Y CALIDAD

### Vitest

Pruebas para:

- Funciones de negocio.
- Cálculos monetarios.
- Descuentos.
- Validaciones.
- Inventario.
- Reservas.
- Transiciones de estado.
- Idempotencia.

### Playwright

Pruebas E2E para:

- Navegación.
- Catálogo.
- Filtros.
- Variantes.
- Carrito.
- Autenticación.
- Checkout.
- Pagos sandbox.
- Administración.
- Facturación manual.

Probar especialmente:

- Compras simultáneas de la última unidad.
- Webhooks duplicados.
- Webhooks inválidos.
- Pagos tardíos.
- Reservas vencidas.
- Falta de stock.
- Reembolsos.
- Accesos no autorizados.
- Documentos privados.

No considerar una fase terminada únicamente porque el código compila.

Cada fase debe contar con pruebas y criterios de aceptación concretos.

---

# 21. GIT, GITHUB, CI/CD Y DEPLOY

Utilizar:

- Git.
- GitHub.
- GitHub Actions.
- Vercel.

### GitHub Actions

Utilizar para:

- ESLint.
- TypeScript.
- Vitest.
- Build.
- Checks de Pull Requests.
- Backups cuando exista un workflow seguro y sin costos adicionales.

Configurar permisos mínimos y proteger secretos.

### Vercel

Utilizar su integración nativa con GitHub para:

- Previews.
- Builds.
- Despliegues.
- Producción.

No duplicar despliegues innecesariamente mediante GitHub Actions.

### Dominio y DNS

- Registrador: Namecheap.
- DNS: Cloudflare.
- Hosting: Vercel.

No ejecutar modificaciones reales de DNS, dominios ni deploys productivos durante la planificación.

Verificar que todos los planes seleccionados permiten el uso comercial del negocio.

---

# 22. ALCANCE DEL MVP

El objetivo es entregar una tienda funcional que pueda gestionar correctamente una operación comercial real.

Prioridades:

1. Fundaciones del proyecto.
2. Supabase y modelo de datos.
3. Autenticación y permisos.
4. Catálogo.
5. Productos y variantes.
6. Imágenes.
7. Inventario.
8. Storefront.
9. Carrito.
10. Órdenes.
11. Checkout.
12. Mercado Pago Sandbox.
13. Panel administrativo.
14. Facturación manual.
15. Devoluciones y posventa.
16. Integración logística cuando se elija proveedor.
17. Emails.
18. Testing integral.
19. Monitoreo.
20. Preparación de producción.

No implementar en el MVP:

- Marketplace multivendedor.
- Multimoneda.
- Multidepósito operativo.
- Microservicios.
- Integración fiscal automática.
- Múltiples pasarelas de pago.
- Múltiples proveedores logísticos sin necesidad.
- Automatizaciones comerciales avanzadas.
- Servicios pagos adicionales.

---

# 23. METODOLOGÍA DE PLANIFICACIÓN

Quiero que trabajes de manera ordenada.

### ETAPA 1 — Auditoría del entorno

Inspeccioná:

- Repositorio.
- Estructura de carpetas.
- Archivos existentes.
- package.json si existe.
- Dependencias.
- Configuraciones.
- Git.
- GitHub.
- Entornos y herramientas disponibles.

No asumas que el repositorio está vacío: verificá su estado real.

No sobrescribas archivos o configuraciones existentes.

### ETAPA 2 — Investigación

Revisá:

- Skills.
- MCP disponibles.
- Documentación oficial.
- Versiones estables y compatibles.
- Límites de los planes gratuitos.
- Condiciones comerciales de los servicios relevantes.
- Riesgos de integración.

No agregues dependencias sin justificar su necesidad.

### ETAPA 3 — Diseño de arquitectura

Entregá:

- Arquitectura general.
- Estructura de carpetas.
- Responsabilidades de los módulos.
- Modelo de datos PostgreSQL.
- Relaciones.
- Constraints.
- Índices.
- RLS.
- Estrategia de autenticación.
- Inventario y reservas.
- Carrito.
- Órdenes.
- Pagos.
- Logística desacoplada.
- Facturación manual.
- Outbox e Inbox.
- Estrategia de backups.
- Testing.
- CI/CD.
- Observabilidad.

### ETAPA 4 — Roadmap

Dividí el trabajo en fases pequeñas, ordenadas por dependencias.

Para cada fase especificá:

- Objetivo.
- Funcionalidades.
- Módulos.
- Tareas técnicas.
- Archivos principales que se crearían o modificarían.
- Dependencias.
- Pruebas.
- Criterios de aceptación.
- Riesgos.
- Bloqueos externos.

Priorizá entregas completas y funcionales.

### ETAPA 5 — Presupuesto y riesgos

Presentá una tabla con:

| Servicio      | Uso                | Plan previsto          | Costo recurrente autorizado |
| ------------- | ------------------ | ---------------------- | --------------------------- |
| Vercel        | Hosting y deploy   | Comercial compatible   | Sí                          |
| Namecheap     | Dominio            | Según registro         | Sí                          |
| Supabase      | Backend y datos    | Gratuito               | No                          |
| Mercado Pago  | Pagos              | Según transacción      | Sin abono adicional         |
| Resend        | Emails             | Gratuito               | No                          |
| Sentry        | Monitoreo          | Gratuito               | No                          |
| PostHog       | Analítica          | Gratuito               | No                          |
| Cloudflare    | DNS                | Gratuito               | No                          |
| Cloudflare R2 | Backups opcionales | Evaluar cuota gratuita | No                          |
| GitHub        | Repositorio y CI   | Gratuito               | No                          |

Los valores y límites deben verificarse en documentación oficial vigente.

Si una funcionalidad requiere un gasto no autorizado, debe señalarse como bloqueante o alternativa pendiente. Nunca contratar automáticamente.

### ETAPA 6 — Decisiones pendientes

Separá claramente:

**Decisiones definidas:**

- Stack.
- Arquitectura.
- Presupuesto.
- Operación con stock propio.
- Ubicación.
- Mercado Pago.
- Facturación manual.
- Estrategia de desarrollo.

**Decisiones comerciales pendientes:**

- Selección logística.
- Tarifas.
- Cobertura.
- Modalidades de despacho.
- Admisión de perfumes.
- Admisión de electrónicos con baterías.
- Condiciones de seguro.
- Procedimiento fiscal con el contador.

**Decisiones técnicas que podés resolver:**
Podés recomendar una solución sin consultarme cuando se encuentre dentro del stack y presupuesto autorizados. Justificá brevemente decisiones importantes.

Consultame únicamente cuando exista una decisión comercial, de presupuesto, de seguridad o de producto que realmente necesite intervención humana.

---

# 24. RESULTADO ESPERADO

Quiero un plan técnico profesional y accionable.

No busco una lista genérica de buenas prácticas ni una arquitectura académica.

Quiero que pienses como un arquitecto de software que debe construir una tienda que va a procesar:

- Ventas reales.
- Stock real.
- Pagos reales.
- Datos personales.
- Información de clientes.
- Operaciones logísticas.
- Comprobantes comerciales.

La prioridad es entregar valor progresivamente sin comprometer la integridad del negocio.

**La arquitectura debe ser lo suficientemente buena para crecer, pero suficientemente sencilla y económica para comenzar.**

Al finalizar cada fase de implementación, el agente deberá presentar:

- Resumen de cambios.
- Archivos creados y modificados.
- Decisiones tomadas.
- Pruebas ejecutadas.
- Resultados.
- Errores encontrados.
- Pendientes.
- Bloqueos concretos.

No avanzar automáticamente sobre fases con errores críticos o pruebas fallidas.

No replantear la arquitectura completa ante cada inconveniente menor. Resolver problemas concretos manteniendo las decisiones aprobadas.

---

# 25. INSTRUCCIÓN FINAL

**Por ahora, permanecé exclusivamente en Plan Mode.**

No escribas código, no instales paquetes, no crees migraciones, no modifiques archivos, no habilites servicios, no contrates planes y no realices operaciones externas.

Inspeccioná, investigá y prepará el plan desde cero utilizando este documento como fuente de verdad.

Quiero revisar una propuesta concreta antes de autorizar la implementación.

El objetivo final es construir Zyven Store: un e-commerce propio, profesional, seguro, económicamente sostenible y preparado para acompañar el crecimiento del negocio.

# 26. IDENTIDAD VISUAL Y CATÁLOGO INICIAL — ZYVEN STORE

Esta sección complementa el contexto general del proyecto y contiene información real proporcionada por el negocio.

En la carpeta zyven-multimedia contiene recursos gráficos de Zyven Store, incluyendo:

- Logos en diferentes versiones.

- Favicons.

- Banners para la tienda.

- Otros recursos visuales de marca.

Instrucciones:

Inspeccioná el contenido completo de esta carpeta antes de diseñar la interfaz.

Identificá cada recurso, su formato, dimensiones y posibles variantes.

Evaluá qué archivos son adecuados para cada uso: header, footer, storefront, favicon, banners principales y otros espacios de la tienda.

Utilizá estos recursos desde la primera implementación, siempre que sean compatibles con el contexto visual.

Respetá los archivos originales: no los sobrescribas, elimines ni modifiques.

Mantené sus rutas organizadas y utilizá nombres y referencias consistentes.

No generes versiones nuevas ni reemplaces los recursos existentes sin una necesidad concreta.

Estos recursos son provisionales desde el punto de vista de la marca: posteriormente podré reemplazarlos manualmente por versiones definitivas si decido realizar ajustes de identidad visual.

## A. Identidad visual

La identidad visual de Zyven Store utilizará tres colores principales:

- Blanco: `#FFFFFF` — RGB(255, 255, 255).
- Negro: `#111111` — RGB(17, 17, 17).
- Violeta principal: `#7B19EC` — RGB(123, 25, 236).

El violeta `#7B19EC` es un color de marca definido y no debe reemplazarse por otro tono arbitrario.

### Dirección estética

Queremos una tienda:

- Moderna.
- Minimalista.
- Profesional.
- Tecnológica.
- Visualmente atractiva.
- Con una identidad comercial reconocible.

Criterios de aplicación:

- Fondos predominantemente blancos.
- Tipografía negra o de alto contraste.
- Violeta para botones principales, enlaces, indicadores activos y elementos destacados.
- Componentes limpios y consistentes.
- Tarjetas de producto con buena presentación visual.
- Diseño responsive y mobile-first.
- Animaciones sutiles cuando aporten valor.

Evitar:

- Saturar toda la interfaz de violeta.
- Degradados excesivos.
- Sombras exageradas.
- Diseños genéricos de dashboard.
- Inconsistencia entre storefront y panel administrativo.

Evaluar tipografías adecuadas para la identidad, priorizando rendimiento y legibilidad, podemos implementar la tipografia Montserrat.

Crear tokens de diseño compatibles con Tailwind CSS y aprovechar el sistema de temas de shadcn/ui.

No inventar ni modificar un logo definitivo. Si se proporcionan archivos de marca posteriormente, utilizarlos como fuente de verdad.

## B. Catálogo inicial

El negocio proporcionó los siguientes productos.

### Categoría: Perfumes

1. Jean Paul Gaultier Le Male Elixir EDP 100 ml.
2. Jean Paul Gaultier Le Male EDP 100 ml.
3. Jean Paul Gaultier Le Beau Le Parfum 100 ml.
4. Valentino Uomo Born in Roma Intense 100 ml.
5. Invictus Pogo Rebanne 100 ml (nombre comercial pendiente de confirmar).
6. Xerjoff Erba Pura con pañuelo 100 ml.
7. Xerjoff Purple Accento 100 ml.
8. Pattern Ref B976-2 100 ml.
9. Stronger Your Intensely (nombre comercial pendiente de confirmar).
10. Paco Rabanne One Million 100 ml.
11. Carolina Herrera Bad Boy Eau de Parfum 110 ml.

### Categoría: Tecnología

1. Cable USB-C para iPhone de 1 metro.
2. Cargador portátil inalámbrico MagSafe para iPhone.
3. AirPods Pro de tercera generación.
4. Parlante Bluetooth portátil JBL GO 4 Pro, disponible en varios colores.

No inventar los colores disponibles. Dejar configurable la incorporación de nuevas variantes desde administración.

### Categoría: Indumentaria

1. Remera Nike Pro Dri-FIT Tight Top, talle M.

Dejar preparada la gestión de variantes por talle y color para futuras prendas.

## C. Datos iniciales y seed de desarrollo

Se proporcionan precios y cantidades ficticias para facilitar el desarrollo y las pruebas.

Utilizar los siguientes datos únicamente como valores iniciales de demostración:

| Producto                                | Precio demo (ARS) | Stock demo |
| --------------------------------------- | ----------------: | ---------: |
| JPG Le Male Elixir EDP 100 ml           |            250000 |          2 |
| JPG Le Male EDP 100 ml                  |            210000 |          3 |
| JPG Le Beau Le Parfum 100 ml            |            270000 |          2 |
| Valentino Born in Roma Intense 100 ml   |            230000 |          2 |
| Invictus, nombre pendiente de confirmar |            190000 |          3 |
| Xerjoff Erba Pura 100 ml                |            360000 |          2 |
| Xerjoff Purple Accento 100 ml           |            390000 |          1 |
| Pattern Ref B976-2 100 ml               |            160000 |          2 |
| Stronger Your Intensely                 |            220000 |          2 |
| Paco Rabanne One Million 100 ml         |            200000 |          3 |
| Carolina Herrera Bad Boy EDP 110 ml     |            210000 |          2 |
| Cable USB-C para iPhone 1 m             |             12000 |         10 |
| Cargador portátil inalámbrico MagSafe   |             35000 |          4 |
| AirPods Pro 3.ª generación              |            350000 |          2 |
| JBL GO 4 Pro                            |             90000 |          4 |
| Nike Pro Dri-FIT Tight Top M            |             65000 |          3 |

IMPORTANTE:

- Todos los precios son ficticios.
- No representan valores comerciales ni precios de mercado.
- No se utilizaron fuentes externas para establecerlos.
- Todos los productos deben crearse inicialmente como borradores y permanecer sin publicar.
- No cargar estos valores en producción.
- El administrador modificará precios y stock desde el panel.
- Los datos deben poder editarse y eliminarse normalmente.
- Generar SKU provisionales únicos y editables para los productos y variantes.
- No utilizar el catálogo como una estructura rígida: deben poder agregarse nuevas categorías y variantes.

## D. Consideraciones de calidad del catálogo

Antes de publicar los productos se deberán revisar manualmente:

- Nombres comerciales exactos.
- Marcas.
- Modelos.
- Presentaciones y volúmenes.
- Colores realmente disponibles.
- Compatibilidad de accesorios.
- Imágenes.
- Precios.
- Stock real.

Hay algunos nombres que requieren confirmación comercial, especialmente Invictus Pogo Rebanne, Pattern Ref B976-2 y Stronger Your Intensely. No corregirlos mediante suposiciones.

Los datos proporcionados sirven como casos de referencia para diseñar el catálogo, sus categorías, atributos, variantes y fichas de producto.

No hardcodear estos productos en componentes de interfaz ni utilizarlos para imponer restricciones al modelo de datos general.
