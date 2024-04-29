CREATE DATABASE WhirlyDB;

USE WhirlyDB;

CREATE TABLE Rol (
    rolID INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50)
);

INSERT INTO Rol (nombre) VALUES('Promotor'); 
INSERT INTO Rol (nombre) VALUES('Finanzas'); 

CREATE TABLE ArticulosAvatar(
    articuloID INT IDENTITY(1,1) PRIMARY KEY,
    tipo VARCHAR(50),
    costoPuntos INT,
    nombre VARCHAR(50),
    sprite VARCHAR(8000)
);

INSERT INTO ArticulosAvatar (tipo,costoPuntos,nombre,sprite) VALUES ('Gorro',10,'Gorro 1','AAAAAAAA');
INSERT INTO ArticulosAvatar (tipo,costoPuntos,nombre,sprite) VALUES ('Accesorio',20,'Lentes 1','ABAAAAAA');

CREATE TABLE Sucursal (
    sucursalID INT IDENTITY(1,1) PRIMARY KEY,
    nombreTienda VARCHAR(35),
    nombre VARCHAR(127),
    direccion VARCHAR(100),
    latitude varchar(35),
    longitud varchar(35)
);

INSERT INTO Sucursal (nombreTienda,nombre,direccion,latitude,longitud) 
VALUES ('Liverpool', 'Liverpool Valle Oriente', 'Av. Lázaro Cárdenas 1000-Oriente, Valle del Mirador, 64750 Monterrey, N.L.','25.638286387394054','-100.31392366546982');


CREATE TABLE Prioridad (
    prioridadID INT IDENTITY(1,1) PRIMARY KEY,
    numeroPrioridad INT,
    descripcion VARCHAR(50)
);

INSERT INTO Prioridad (numeroPrioridad,descripcion) VALUES (1,'Baja');
INSERT INTO Prioridad (numeroPrioridad,descripcion) VALUES (2,'Media');
INSERT INTO Prioridad (numeroPrioridad,descripcion) VALUES (3,'Alta');


CREATE TABLE Estado (
    estadoID INT IDENTITY(1,1) PRIMARY KEY,
    nombreEstado VARCHAR(50)
);


INSERT INTO Estado (nombreEstado) VALUES ('Pendiente');
INSERT INTO Estado (nombreEstado) VALUES ('En Proceso');
INSERT INTO Estado (nombreEstado) VALUES ('Resuelto');
INSERT INTO Estado (nombreEstado) VALUES ('Rechazado');

CREATE TABLE Empleado (
    empleadoID INT IDENTITY(1,1) PRIMARY KEY,
    rolID INT NOT NULL,
    nombre VARCHAR(50),
    apellidoPat VARCHAR(50),
    apellidoMat VARCHAR(50),
    puntos INT NOT NULL,
    monedas INT NOT NULL,
    FOREIGN KEY (rolID) REFERENCES Rol(rolID),
);


INSERT INTO Empleado (rolID,nombre,apellidoPat,apellidoMat,puntos,monedas)
VALUES (1,'Javier','Cruz','Villarreal',0,0);

INSERT INTO Empleado (rolID,nombre,apellidoPat,apellidoMat,puntos,monedas)
VALUES (1,'Jose Pablo','Santos','Quiroga',0,0);

CREATE TABLE Reporte (
    reporteID INT IDENTITY(1,1) PRIMARY KEY,
    empleadoRealizaID INT NOT NULL,
    promotorID INT,
    fechaGenerado DATETIME, 
    fechaResolucion DATETIME,
    descripcion VARCHAR(8000),
    sucursalID INT NOT NULL,
    prioridadID INT,
    estadoID INT,
    FOREIGN KEY (empleadoRealizaID) REFERENCES Empleado(empleadoID),
    FOREIGN KEY (promotorID) REFERENCES Empleado(empleadoID),
    FOREIGN KEY (sucursalID) REFERENCES Sucursal(sucursalID),
    FOREIGN KEY (prioridadID) REFERENCES Prioridad(prioridadID),
    FOREIGN KEY (estadoID) REFERENCES Estado(estadoID)
);

CREATE TABLE Foto ( 
    fotoID INT IDENTITY(1,1) PRIMARY KEY,
    foto VARBINARY(MAX),
    reporteID INT NOT NULL,
    FOREIGN KEY (reporteID) REFERENCES Reporte(reporteID)
);

CREATE TABLE LogrosRecibidos (
    logroID INT IDENTITY(1,1) PRIMARY KEY,
    empleadoID INT NOT NULL,
    fecha DATETIME,
    puntos INT,
    FOREIGN KEY (empleadoID) REFERENCES Empleado(empleadoID)
);

CREATE TABLE ArticulosComprados (
    articuloID INT NOT NULL,
    empleadoID INT NOT NULL,
    FOREIGN KEY (articuloID) REFERENCES ArticulosAvatar(articuloID),
    FOREIGN KEY (empleadoID) REFERENCES Empleado(empleadoID)
);

GO
CREATE PROC SpSubirReporte
@empleadoRealizaID INT,
@descripcion VARCHAR(8000),
@sucursalID INT,
@prioridadID INT,
@estadoID INT,
@foto VARBINARY(MAX)
AS
BEGIN
    DECLARE @fechaGenerado DATETIME;
    SET @fechaGenerado = GETDATE();
    INSERT INTO [WhirlyDB].[dbo].[Reporte] (empleadoRealizaID, fechaGenerado,descripcion,sucursalID,prioridadID,estadoID)
    VALUES (@empleadoRealizaID, @fechaGenerado,@descripcion,@sucursalID,@prioridadID,@estadoID);

    DECLARE @reporteID INT;
    SELECT @reporteID =  MAX(reporteID) FROM [WhirlyDB].[dbo].[Reporte]; -- Aquí guardamos el ultimo ID de Reporte

    INSERT INTO [WhirlyDB].[dbo].[Foto] (foto,reporteID) 
    VALUES (@foto,@reporteID)
END;

GO 
CREATE PROC SpDarPuntos
@empleadoID INT,
@cantidadPuntos INT
AS
BEGIN
    DECLARE @fechaDado DATETIME;
    SET @fechaDado = GETDATE();

    INSERT INTO [WhirlyDB].[dbo].[LogrosRecibidos] (empleadoID,fecha,puntos)
    VALUES (@empleadoID,@fechaDado,@cantidadPuntos)

    UPDATE [WhirlyDB].[dbo].[Empleado]
    SET puntos = puntos + @cantidadPuntos,
    monedas = monedas + @cantidadPuntos
    WHERE empleadoID = @empleadoID
END;

INSERT INTO Empleado (rolID,nombre,apellidoPat,apellidoMat,puntos,monedas,accesorioAvatarID, gorroAvatarID)
VALUES (1,'David','Martinez','Muraira',1,1,1,1);

GO
CREATE PROC SpComprarArticulo
@empleadoID INT,
@articuloID INT,
@costo INT
AS
BEGIN
    INSERT INTO [WhirlyDB].[dbo].[ArticulosComprados] (empleadoID, articuloID)
    VALUES (@empleadoID, @articuloID);

    UPDATE Empleado SET monedas = monedas - @costo WHERE empleadoID = @empleadoID;
END;

GO
CREATE PROC SpInsertArticulo
@nombre VARCHAR(50),
@tipo VARCHAR(50),
@costo INT
AS
BEGIN
    INSERT INTO [WhirlyDB].[dbo].[ArticulosAvatar] (tipo, costoPuntos,nombre)
    VALUES (@tipo, @costo,@nombre);
END;


EXEC SpInsertArticulo 'cap_blue','Gorro',50
EXEC SpInsertArticulo 'cap_red','Gorro',50
EXEC SpInsertArticulo 'cap_winter','Gorro',50
EXEC SpInsertArticulo 'casco','Gorro',50
EXEC SpInsertArticulo 'chef','Gorro',50
EXEC SpInsertArticulo 'cow','Gorro',50
EXEC SpInsertArticulo 'mexican','Gorro',50
EXEC SpInsertArticulo 'party','Gorro',50
EXEC SpInsertArticulo 'phone', 'Acc', 25
EXEC SpInsertArticulo 'smokin', 'Acc', 25
EXEC SpInsertArticulo 'suitcase', 'Acc',25
EXEC SpInsertArticulo 'tie', 'Acc', 25
EXEC SpInsertArticulo 'umbrella_closed', 'Acc', 25
EXEC SpInsertArticulo 'umbrella_open', 'Acc', 25





