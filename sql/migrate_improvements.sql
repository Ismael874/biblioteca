-- SOLO NECESARIO para una BiblionDB ya existente creada con la versión
-- vieja de create_schema.sql (sin CASCADE/índices). Si vas a crear la base
-- desde cero, no ejecutes esto: create_schema.sql ya incluye estas mejoras.
--
-- Mejoras al esquema de BiblionDB:
-- 1) ON DELETE CASCADE en las FKs que dependen de Books/Users, para que
--    borrar un libro o un usuario no falle con un error de FK (500) cuando
--    ya tiene compras/alquileres/capítulos asociados.
-- 2) Índices en columnas usadas frecuentemente en JOIN/WHERE (antes solo las
--    PK tenían índice; las FK no se indexan automáticamente en SQL Server).
-- 3) Constraint de validación para la columna role.
--
-- Seguro de re-ejecutar (usa IF EXISTS / nombres fijos en vez de los
-- autogenerados FK__Tabla__col__HASH que tenía el esquema original).

USE BiblionDB;
GO

-- 1) Recrear FKs con ON DELETE CASCADE y nombres explícitos
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Chapters__bookId__5DCAEF64')
  ALTER TABLE Chapters DROP CONSTRAINT FK__Chapters__bookId__5DCAEF64;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Chapters_Books')
  ALTER TABLE Chapters ADD CONSTRAINT FK_Chapters_Books FOREIGN KEY (bookId) REFERENCES Books(id) ON DELETE CASCADE;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Purchases__bookI__5441852A')
  ALTER TABLE Purchases DROP CONSTRAINT FK__Purchases__bookI__5441852A;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Purchases_Books')
  ALTER TABLE Purchases ADD CONSTRAINT FK_Purchases_Books FOREIGN KEY (bookId) REFERENCES Books(id) ON DELETE CASCADE;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Purchases__buyer__5535A963')
  ALTER TABLE Purchases DROP CONSTRAINT FK__Purchases__buyer__5535A963;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Purchases_Users')
  ALTER TABLE Purchases ADD CONSTRAINT FK_Purchases_Users FOREIGN KEY (buyerId) REFERENCES Users(id) ON DELETE CASCADE;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Rentals__bookId__59063A47')
  ALTER TABLE Rentals DROP CONSTRAINT FK__Rentals__bookId__59063A47;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Rentals_Books')
  ALTER TABLE Rentals ADD CONSTRAINT FK_Rentals_Books FOREIGN KEY (bookId) REFERENCES Books(id) ON DELETE CASCADE;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Rentals__renterI__59FA5E80')
  ALTER TABLE Rentals DROP CONSTRAINT FK__Rentals__renterI__59FA5E80;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Rentals_Users')
  ALTER TABLE Rentals ADD CONSTRAINT FK_Rentals_Users FOREIGN KEY (renterId) REFERENCES Users(id) ON DELETE CASCADE;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK__Subscript__userI__619B8048')
  ALTER TABLE Subscriptions DROP CONSTRAINT FK__Subscript__userI__619B8048;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Subscriptions_Users')
  ALTER TABLE Subscriptions ADD CONSTRAINT FK_Subscriptions_Users FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE;
GO

-- 2) Índices en columnas usadas en JOIN/WHERE frecuentes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Books_OwnerId')
  CREATE INDEX IX_Books_OwnerId ON Books(ownerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Books_Categoria')
  CREATE INDEX IX_Books_Categoria ON Books(categoria);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Purchases_BuyerId')
  CREATE INDEX IX_Purchases_BuyerId ON Purchases(buyerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Rentals_RenterId')
  CREATE INDEX IX_Rentals_RenterId ON Rentals(renterId);
GO

-- 3) Validar valores de role
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
  ALTER TABLE Users ADD CONSTRAINT CK_Users_Role CHECK (role IN ('user', 'admin'));
GO
