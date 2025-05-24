# FolderFlow - Trabajo de Fin de Grado (TFG)

**FolderFlow** es una plataforma web de gestión documental que permite a los usuarios organizar, almacenar y consultar documentos en la nube de manera eficiente y segura. Este repositorio contiene tanto el frontend (Angular) como el backend (Node.js/Express + MongoDB + AWS S3).

---

## Tabla de Contenidos

- [1. Estructura del Proyecto](#1-estructura-del-proyecto)
- [2. Arquitectura General](#2-arquitectura-general)
- [3. Frontend: Angular](#3-frontend-angular)
- [4. Backend: Node.js/Express](#4-backend-nodejsexpress)
  - [4.1. Endpoints de Autenticación](#41-endpoints-de-autenticación)
  - [4.2. Endpoints de Carpetas](#42-endpoints-de-carpetas)
  - [4.3. Endpoints de Documentos](#43-endpoints-de-documentos)
- [5. Otros Detalles Técnicos](#5-otros-detalles-técnicos)
- [6. Recursos y Créditos](#6-recursos-y-créditos)

---

## 1. Estructura del Proyecto

La estructura del repositorio está organizada para separar claramente los componentes del frontend y backend, así como facilitar la escalabilidad y el mantenimiento. A continuación se describe la estructura y el propósito de los principales directorios y archivos:

```
/
├── backend/                       # API RESTful, lógica de negocio y conexión a servicios externos
│   ├── src/
│   │   ├── config/                # Configuración de la base de datos, variables de entorno, etc.
│   │   ├── controllers/           # Controladores: lógica asociada a las rutas
│   │   ├── middleware/            # Middlewares personalizados (autenticación, errores, etc.)
│   │   ├── models/                # Modelos de datos (Mongoose schemas)
│   │   ├── routes/                # Definición de rutas de la API REST
│   │   ├── services/              # Lógica de negocio y servicios externos (ej. AWS S3)
│   │   └── utils/                 # Utilidades y funciones auxiliares
│   ├── package.json               # Dependencias y scripts del backend
│   ├── server.js                  # Punto de entrada del servidor Express
│   └── .env.example               # Ejemplo de configuración de variables de entorno
│
├── frontend/                      # Aplicación cliente (SPA) desarrollada en Angular
│   ├── src/
│   │   ├── app/                   # Componentes, servicios y módulos principales de Angular
│   │   ├── assets/                # Recursos estáticos (imágenes, iconos, etc.)
│   │   ├── environments/          # Configuraciones de entorno (dev/prod)
│   │   └── styles.scss            # Estilos globales
│   ├── angular.json               # Configuración de Angular CLI
│   ├── package.json               # Dependencias y scripts del frontend
│   └── README.md                  # Documentación específica del frontend
│
├── .gitignore                     # Exclusiones de archivos para git
├── README.md                      # Documentación general del proyecto (este archivo)
└── LICENSE                        # Licencia del proyecto
```

---

## 2. Arquitectura General

- **Frontend:** Aplicación Angular (SPA), consume la API REST, interfaz moderna con Angular Material, organización en módulos y componentes.
- **Backend:** Node.js + Express, estructura modular, conexión con MongoDB para datos y AWS S3 para archivos, autenticación JWT, middlewares para seguridad, validación y manejo de errores.
- **Comunicación:** El frontend realiza peticiones HTTP al backend usando endpoints RESTful. El backend expone rutas agrupadas en `/api/auth`, `/api/folders` y `/api/documents`.

---

## 3. Frontend: Angular

- **Framework:** Angular 19
- **Lenguajes:** TypeScript, SCSS, HTML
- **Características:**
  - SPA con Angular Material para UI responsiva
  - Organización jerárquica de carpetas y documentos
  - Autenticación JWT
  - Consumo de API RESTful
- **Estructura del código:** Modular, con servicios para abstracción de llamadas HTTP y manejo centralizado de estado y rutas.

### Comandos principales (solo referencia, no es necesario ejecutar):

- `ng serve` — Arrancar servidor de desarrollo Angular
- `ng build` — Construir versión de producción
- `ng test` — Ejecutar tests unitarios

Más detalles y comandos en [`frontend/README.md`](./frontend/README.md).

---

## 4. Backend: Node.js/Express

- **Framework:** Node.js 20 + Express 5
- **Base de datos:** MongoDB (mediante Mongoose)
- **Almacenamiento archivos:** AWS S3 (SDK v3)
- **Autenticación:** JWT (jsonwebtoken + bcrypt)
- **Estructura:** Rutas → Controladores → Servicios → Modelos

### 4.1. Endpoints de Autenticación

**Base:** `/api/auth`

| Método | Ruta              | Descripción                               | Protección |
|--------|-------------------|-------------------------------------------|------------|
| POST   | `/register`       | Registrar usuario (nombre, email, pass)   | No         |
| POST   | `/login`          | Login usuario (email, pass)               | No         |
| PUT    | `/profile`        | Actualizar perfil (nombre, email)         | Sí         |
| PUT    | `/profile-image`  | Actualizar imagen de perfil               | Sí         |
| PUT    | `/password`       | Cambiar contraseña                        | Sí         |

**Notas:**
- Las rutas protegidas requieren token JWT (middleware `protect`).
- El proceso de registro y login devuelve datos del usuario y (en login) un token JWT.

### 4.2. Endpoints de Carpetas

**Base:** `/api/folders`  
**Todas las rutas protegidas con JWT**

| Método | Ruta                        | Descripción                                                          |
|--------|-----------------------------|----------------------------------------------------------------------|
| GET    | `/stats`                    | Obtener estadísticas globales o de una carpeta (por id opcional)     |
| POST   | `/`                         | Crear una nueva carpeta (parámetros: nombre, parentId opcional)      |
| GET    | `/`                         | Listar carpetas del usuario, contenido de una carpeta (parentId)     |
| GET    | `/:folderId`                | Obtener detalles de una carpeta específica                           |
| DELETE | `/:folderId`                | Eliminar carpeta (si está vacía)                                     |
| PATCH  | `/:folderId/move`           | Mover carpeta a otra carpeta padre                                   |
| POST   | `/by-ids`                   | Obtener varias carpetas por sus IDs                                  |
| PATCH  | `/:folderId/name`           | Renombrar carpeta                                                    |

**Notas:**
- El usuario solo accede a sus propias carpetas (validación en backend).
- El endpoint `stats` puede devolver, por ejemplo, número de documentos/carpetas hijas.

### 4.3. Endpoints de Documentos

**Base:** `/api/documents`  
**Todas las rutas protegidas con JWT**

| Método | Ruta                                | Descripción                                                        |
|--------|-------------------------------------|--------------------------------------------------------------------|
| POST   | `/upload-url`                       | Obtener URL firmada para subir documento a S3                      |
| POST   | `/confirm-upload`                   | Confirmar subida y guardar metadatos en BD                         |
| GET    | `/`                                 | Listar documentos de una carpeta (por folderId)                    |
| GET    | `/:documentId/download-url`         | Obtener URL firmada para descargar documento de S3                 |
| DELETE | `/:documentId`                      | Eliminar documento del usuario                                     |
| GET    | `/all`                              | Obtener todos los documentos del usuario                           |
| PATCH  | `/:documentId/move`                 | Mover documento a otra carpeta                                     |
| GET    | `/recent`                           | Obtener documentos recientes del usuario (limit opcional)          |
| GET    | `/favorites`                        | Obtener documentos marcados como favoritos                         |
| GET    | `/stats`                            | Obtener estadísticas de documentos                                 |
| PATCH  | `/:documentId/favorite`             | Marcar o desmarcar documento como favorito                         |
| GET    | `/:documentId`                      | Obtener detalles de un documento                                   |
| PATCH  | `/:documentId/name`                 | Renombrar documento                                                |

**Notas:**
- El flujo de subida es: `/upload-url` (recibe URL de S3) → subir archivo a S3 → `/confirm-upload` (registra metadatos).
- El endpoint `/recent` y `/favorites` permiten personalización de experiencia.
- Los endpoints usan validación de input y manejo de errores global.

---

## 5. Otros Detalles Técnicos

- **Middleware:**
  - `protect`: Verifica JWT y añade info del usuario a `req.user`.
  - Manejo de CORS y parsing de JSON.
  - Manejador global de errores para respuestas consistentes.

- **Servicios externos:**
  - AWS S3: Almacenamiento de archivos binarios, URLs firmadas para seguridad.
  - MongoDB: Almacenamiento de metadatos (usuarios, carpetas, documentos).

- **Buenas prácticas:**
  - Separación de lógica en controladores y servicios.
  - Validación de datos y autorización en todos los endpoints.
  - Modularidad y escalabilidad pensadas para proyectos reales.

---

## 6. Recursos y Créditos

- [Angular](https://angular.dev/)
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [AWS S3](https://aws.amazon.com/s3/)

---

**Autor:** Pablo Zumaquero de Mateo  
**Perfil:** [https://github.com/PzZuMa](https://github.com/PzZuMa)

> Este repositorio es parte de un Trabajo de Fin de Grado. Para cualquier duda técnica, puedes revisar el código fuente o contactar al autor.
