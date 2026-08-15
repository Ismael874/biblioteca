-- Script para crear la base de datos y tablas de Biblion desde cero.
-- Ejecutar en SQL Server (LocalDB) con permisos suficientes, por ejemplo:
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i sql\create_schema.sql
-- Seguro de re-ejecutar: no falla si la base o las tablas ya existen.

IF DB_ID('BiblionDB') IS NULL
  CREATE DATABASE BiblionDB;
GO
USE BiblionDB;
GO

IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE Users (
  id NVARCHAR(64) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  email NVARCHAR(200) NOT NULL UNIQUE,
  matricula NVARCHAR(100) NULL,
  password NVARCHAR(500) NOT NULL,
  role NVARCHAR(50) DEFAULT('user') CONSTRAINT CK_Users_Role CHECK (role IN ('user', 'admin')),
  createdAt DATETIME DEFAULT(GETDATE())
);
GO

IF OBJECT_ID('dbo.Books', 'U') IS NULL
CREATE TABLE Books (
  id NVARCHAR(64) PRIMARY KEY,
  title NVARCHAR(500) NOT NULL,
  author NVARCHAR(300) NOT NULL,
  categoria NVARCHAR(100) NOT NULL,
  description NVARCHAR(MAX) NULL,
  estado NVARCHAR(100) NULL,
  price DECIMAL(18,2) DEFAULT 0,
  isFree BIT DEFAULT 0,
  pdfPath NVARCHAR(1000) NULL,
  coverPath NVARCHAR(1000) NULL,
  ownerId NVARCHAR(64) NULL,
  createdAt DATETIME DEFAULT(GETDATE())
);
GO

IF OBJECT_ID('dbo.Purchases', 'U') IS NULL
CREATE TABLE Purchases (
  id NVARCHAR(64) PRIMARY KEY,
  bookId NVARCHAR(64) CONSTRAINT FK_Purchases_Books REFERENCES Books(id) ON DELETE CASCADE,
  buyerId NVARCHAR(64) CONSTRAINT FK_Purchases_Users REFERENCES Users(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  purchasedAt DATETIME DEFAULT(GETDATE())
);
GO

IF OBJECT_ID('dbo.Rentals', 'U') IS NULL
CREATE TABLE Rentals (
  id NVARCHAR(64) PRIMARY KEY,
  bookId NVARCHAR(64) CONSTRAINT FK_Rentals_Books REFERENCES Books(id) ON DELETE CASCADE,
  renterId NVARCHAR(64) CONSTRAINT FK_Rentals_Users REFERENCES Users(id) ON DELETE CASCADE,
  startAt DATETIME DEFAULT(GETDATE()),
  endAt DATETIME NULL
);
GO

IF OBJECT_ID('dbo.Chapters', 'U') IS NULL
CREATE TABLE Chapters (
  id NVARCHAR(64) PRIMARY KEY,
  bookId NVARCHAR(64) CONSTRAINT FK_Chapters_Books REFERENCES Books(id) ON DELETE CASCADE,
  title NVARCHAR(500),
  content NVARCHAR(MAX),
  createdAt DATETIME DEFAULT(GETDATE())
);
GO

IF OBJECT_ID('dbo.Subscriptions', 'U') IS NULL
CREATE TABLE Subscriptions (
  id NVARCHAR(64) PRIMARY KEY,
  userId NVARCHAR(64) CONSTRAINT FK_Subscriptions_Users REFERENCES Users(id) ON DELETE CASCADE,
  startedAt DATETIME DEFAULT(GETDATE()),
  expiresAt DATETIME NULL,
  [plan] NVARCHAR(100)
);
GO

-- Indices en columnas usadas frecuentemente en JOIN/WHERE (SQL Server no
-- indexa automaticamente las columnas de FK, solo las PK).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Books_OwnerId')
  CREATE INDEX IX_Books_OwnerId ON Books(ownerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Books_Categoria')
  CREATE INDEX IX_Books_Categoria ON Books(categoria);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Purchases_BuyerId')
  CREATE INDEX IX_Purchases_BuyerId ON Purchases(buyerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Rentals_RenterId')
  CREATE INDEX IX_Rentals_RenterId ON Rentals(renterId);
GO

-- La cuenta admin (admin@biblion.local / Admin123!) se crea sola la
-- primera vez que arranca el backend (ver backend/server.js), no hace
-- falta insertarla aqui.
