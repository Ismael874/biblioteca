# Biblion Backend API

API para la plataforma de libros digitales Biblion con soporte para libros gratuitos, compra, alquiler y gestión de PDFs.

## Endpoints

### Autenticación (`/api/auth`)

- **POST /auth/register** - Registrar nuevo usuario
  - Body: `{ name, email, matricula, password }`
  - Returns: `{ success, token, user }`

- **POST /auth/login** - Iniciar sesión
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- **GET /auth/me** - Obtener datos del usuario actual (requiere token)
  - Returns: `{ id, name, email, role, createdAt }`

### Libros (`/api/books`)

- **GET /books** - Listar todos los libros (público)
  - Returns: Array de libros

- **GET /books/:id** - Obtener detalles de un libro (público)
  - Returns: Objeto libro

- **GET /books/:id/cover** - Obtener portada del libro (público)
  - Returns: Imagen de portada

- **POST /books** - Crear nuevo libro (requiere autenticación)
  - Body: Form-data con `title, author, categoria, description, estado, price, isFree, pdf, cover`
  - Returns: `{ success, bookId }`

- **PUT /books/:id** - Actualizar libro (propietario o admin)
  - Body: Form-data con campos opcionales
  - Returns: `{ success }`

- **DELETE /books/:id** - Eliminar libro (propietario o admin)
  - Returns: `{ success }`

- **GET /books/:id/pdf** - Descargar/ver PDF (requiere acceso)
  - Returns: Archivo PDF descargado

### Compras (`/api/purchases`)

- **POST /purchases** - Comprar un libro
  - Body: `{ bookId }`
  - Returns: `{ success, purchaseId }`

- **GET /purchases** - Listar todas las compras (admin solo)
  - Returns: Array de compras

- **GET /purchases/user/:userId** - Listar compras del usuario
  - Returns: Array de compras del usuario

### Alquileres (`/api/rentals`)

- **POST /rentals** - Alquilar un libro
  - Body: `{ bookId, daysToRent }`
  - Returns: `{ success, rentalId, expiresAt }`

- **GET /rentals** - Listar todos los alquileres (admin solo)
  - Returns: Array de alquileres

- **GET /rentals/user/:userId** - Listar alquileres del usuario
  - Returns: Array de alquileres del usuario

## Autenticación

Todos los endpoints que requieren autenticación esperan un header:
```
Authorization: Bearer <token>
```

## Roles

- `user` - Usuario normal
- `admin` - Administrador

## Variables de Entorno

```
DB_SERVER=(localdb)\MSSQLLocalDB
DB_DATABASE=BiblionDB
JWT_SECRET=your_secret_key
PORT=4000
```

## Estructura de Base de Datos

### Users
- id (PK)
- name
- email (UNIQUE)
- matricula
- password (bcrypted)
- role (user/admin)
- createdAt

### Books
- id (PK)
- title
- author
- categoria
- description
- estado
- price
- isFree
- pdfPath
- coverPath
- ownerId (FK Users)
- createdAt

### Purchases
- id (PK)
- bookId (FK Books)
- buyerId (FK Users)
- amount
- purchasedAt

### Rentals
- id (PK)
- bookId (FK Books)
- renterId (FK Users)
- startAt
- endAt

### Chapters
- id (PK)
- bookId (FK Books)
- title
- content
- createdAt

### Subscriptions
- id (PK)
- userId (FK Users)
- startedAt
- expiresAt
- plan

## Instalación (primera vez, ej. después de clonar el repo)

Requisitos previos (una sola vez por máquina):
- **Node.js** (v18+).
- **SQL Server Express LocalDB** — viene con Visual Studio, o se instala solo con "SQL Server Express" (instalador de Microsoft). La instancia por defecto se llama `MSSQLLocalDB` y arranca sola.
- **ODBC Driver 17 for SQL Server** — se instala con el "Client SDK" de SQL Server, o descargable aparte desde Microsoft. Sin esto, `msnodesqlv8` no puede conectar.

Pasos:

```bash
cd backend
npm install
```

1. Copia `.env.example` a `.env` (mismo contenido sirve tal cual si usas LocalDB local con autenticación de Windows — no hay que tocar nada a menos que tu instancia se llame distinto o quieras usar SQL Auth).
2. Crea la base de datos y las tablas ejecutando el script incluido (seguro de re-ejecutar, no falla si ya existe):
   ```bash
   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i ..\sql\create_schema.sql
   ```
   (o ábrelo y ejecútalo desde SQL Server Management Studio conectado a `(localdb)\MSSQLLocalDB`).
3. Arranca el servidor:
   ```bash
   npm start
   ```
   La primera vez que arranca, crea sola una cuenta admin: `admin@biblion.local` / `Admin123!` (cámbiala después iniciando sesión y editando el usuario, o cambia `ADMIN_EMAIL`/`ADMIN_PASSWORD` en `.env` antes del primer arranque).

El servidor correrá en `http://localhost:4000`. Cada vez que quieras usar la app después de esto, solo hace falta el paso 3 (o doble clic en `iniciar-servidor.bat` en la raíz del proyecto) — los pasos 1 y 2 son de una sola vez.
