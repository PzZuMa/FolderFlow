# FolderFlow

FolderFlow es una solución de gestión documental compuesta por un frontend moderno desarrollado en Angular y un backend basado en Node.js/Express, orientado a la organización, resguardo y consulta eficiente de documentos y carpetas.

---

## Estructura General del Proyecto

- **frontend/**: Aplicación Angular (SPA) para la interfaz de usuario.
- **backend/**: API RESTful Node.js/Express, conecta con MongoDB y servicios AWS S3.

---

## Frontend

**Ubicación:** [`/frontend`](./frontend)  
**Framework:** Angular 19  
**Lenguajes:** TypeScript, SCSS, HTML

### Características principales

- UI moderna y responsiva usando Angular Material.
- Organización jerárquica de carpetas y documentos.
- Autenticación y autorización de usuarios.
- Consumo de la API REST del backend.
- Construcción optimizada para producción (`ng build`).

### Scripts principales (`package.json`)

- `start` — Levanta el servidor de desarrollo en `http://localhost:4200/`
- `build` — Compila la app Angular para producción en `dist/`
- `test` — Ejecuta unit tests con Karma

### Configuración relevante

- **Estilos:** SCSS por defecto.
- **Recursos:** Carpeta `src/assets` y soporte para archivos públicos en `public/`.
- **Angular Material:** Tema predefinido `deeppurple-amber`.

### Documentación y comandos útiles

- Para desarrollo:  
  ```bash
  cd frontend
  npm install
  npm start
  ```
- [Más detalles en el README del frontend](./frontend/README.md)

---

## Backend

**Ubicación:** [`/backend`](./backend)  
**Framework:** Node.js + Express  
**Base de datos:** MongoDB  
**Servicios externos:** AWS S3 para almacenamiento de archivos

### Características principales

- API RESTful para autenticación, gestión de carpetas y documentos.
- Middleware para CORS, parsing de JSON y manejo de errores global.
- Modularización por rutas:  
  - `/api/auth` (autenticación)
  - `/api/folders` (gestión de carpetas)
  - `/api/documents` (gestión de documentos)
- Uso de JWT para autenticación.
- Soporte para subida de archivos (probablemente vía endpoints en `/api/documents`).

### Dependencias clave

- `express`, `mongoose`, `mongodb` — Servidor y conexión a la BD.
- `jsonwebtoken`, `bcrypt` — Seguridad y autenticación.
- `@aws-sdk/client-s3`, `aws-sdk` — Integración con Amazon S3.

### Ejemplo de inicio rápido

```bash
cd backend
npm install
# Variables de entorno requeridas en .env (por ejemplo, conexión a MongoDB, claves AWS)
node server.js
```

El backend escuchará por defecto en el puerto `3000` (configurable por variable de entorno `PORT`).

---

## Arquitectura de Comunicación

1. **Frontend (Angular):**  
   Realiza peticiones HTTP a la API backend (`/api/...`), mostrando la información de carpetas y documentos al usuario.

2. **Backend (Express):**  
   Expone endpoints REST para autenticación, carpetas y documentos.  
   Interactúa con MongoDB para almacenar metadatos y con S3 para almacenar archivos binarios.

---

## Instalación y ejecución local

```bash
# 1. Clona el repositorio
git clone https://github.com/PzZuMa/FolderFlow.git
cd FolderFlow

# 2. Arranca el backend
cd backend
npm install
node server.js

# 3. Arranca el frontend (en otra terminal)
cd ../frontend
npm install
npm start

# 4. Accede en tu navegador a http://localhost:4200/
```

> **Nota**: Requiere MongoDB corriendo y credenciales AWS configuradas en un archivo `.env` para el backend.

---

## Recursos útiles y más información

- [Documentación oficial de Angular](https://angular.dev/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [AWS S3](https://aws.amazon.com/s3/)

---

## Licencia

ISC. Consulta el archivo LICENSE para más detalles.

---

**Repositorio mantenido por [PzZuMa](https://github.com/PzZuMa)**
