# Discord Anti-Spam / Legado Roleplay Bot

Bot de Discord para moderación, protección anti-spam, registros, whitelist, sugerencias, respaldos y utilidades de Legado Roleplay.

## Instalación

1. Instala Node.js 22.13 o posterior. El bot usa el módulo SQLite incluido en Node y no necesita dependencias nativas externas.
2. Ejecuta `npm install`.
3. Usa `.env.example` como lista de las variables que debes configurar en tu proveedor de alojamiento.
4. Define `DISCORD_TOKEN` y `DISCORD_CLIENT_ID`.
5. Completa las variables de canales y roles que utilices.
6. Ejecuta `npm run deploy` una vez para registrar los comandos.
7. Inicia el bot con `npm start`.

En Windows también puedes usar `start.bat` después de definir las variables de entorno.

## Seguridad

Las credenciales se leen exclusivamente desde variables de entorno. `.env`, `config.json`, las bases de datos locales, los respaldos privados y las dependencias instaladas están excluidos de Git. No publiques tokens ni claves de API.

Las herramientas de reconstrucción del servidor, integraciones externas y enlaces de pago no forman parte de esta versión desplegable. La whitelist se revisa manualmente por el staff.
