-- PostgreSQL Migration Script
-- Run this script to set up PostgreSQL for StandartDesk

CREATE SCHEMA IF NOT EXISTS standart_desk;
SET search_path TO standart_desk;

-- Users table
CREATE TABLE "Users" (
    "Id" SERIAL PRIMARY KEY,
    "Username" VARCHAR(50) UNIQUE NOT NULL,
    "Email" VARCHAR(254) UNIQUE NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "FullName" VARCHAR(255),
    "Avatar" VARCHAR(2048),
    "Role" INT NOT NULL DEFAULT 1,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP,
    "LastLoginAt" TIMESTAMP
);

CREATE INDEX idx_users_username ON "Users"("Username");
CREATE INDEX idx_users_email ON "Users"("Email");

-- Folders table
CREATE TABLE "Folders" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "OwnerId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "ParentFolderId" INT REFERENCES "Folders"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- Projects table
CREATE TABLE "Projects" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "OwnerId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "FolderId" INT REFERENCES "Folders"("Id") ON DELETE SET NULL,
    "Type" INT NOT NULL,
    "IsArchived" BOOLEAN NOT NULL DEFAULT false,
    "CurrentOpenByUserId" INT REFERENCES "Users"("Id") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- Pages table
CREATE TABLE "Pages" (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INT NOT NULL REFERENCES "Projects"("Id") ON DELETE CASCADE,
    "Name" VARCHAR(255) NOT NULL,
    "Thumbnail" TEXT,
    "Order" INT NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- BlockSchemas table
CREATE TABLE "BlockSchemas" (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INT REFERENCES "Projects"("Id") ON DELETE CASCADE,
    "PageId" INT REFERENCES "Pages"("Id") ON DELETE CASCADE,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- BlockSchemaVersions table
CREATE TABLE "BlockSchemaVersions" (
    "Id" SERIAL PRIMARY KEY,
    "BlockSchemaId" INT NOT NULL REFERENCES "BlockSchemas"("Id") ON DELETE CASCADE,
    "VersionNumber" INT NOT NULL,
    "Data" JSONB,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE "Tasks" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "ProjectId" INT REFERENCES "Projects"("Id") ON DELETE SET NULL,
    "TaskDomainId" INT,
    "Status" INT NOT NULL,
    "Priority" INT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- TaskComments table
CREATE TABLE "TaskComments" (
    "Id" SERIAL PRIMARY KEY,
    "TaskId" INT NOT NULL REFERENCES "Tasks"("Id") ON DELETE CASCADE,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Content" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE "Comments" (
    "Id" SERIAL PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AuditLogs table
CREATE TABLE "AuditLogs" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Action" VARCHAR(100) NOT NULL,
    "EntityType" VARCHAR(100),
    "EntityId" INT,
    "Changes" JSONB,
    "Timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IpAddress" VARCHAR(45)
);

CREATE INDEX idx_auditlogs_userid ON "AuditLogs"("UserId");
CREATE INDEX idx_auditlogs_timestamp ON "AuditLogs"("Timestamp");

-- Notifications table
CREATE TABLE "Notifications" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Title" VARCHAR(255) NOT NULL,
    "Message" TEXT,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ChatSessions table
CREATE TABLE "ChatSessions" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Title" VARCHAR(255),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- TaskDomains table
CREATE TABLE "TaskDomains" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "OwnerId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- TaskDomainAccess table
CREATE TABLE "TaskDomainAccess" (
    "Id" SERIAL PRIMARY KEY,
    "TaskDomainId" INT NOT NULL REFERENCES "TaskDomains"("Id") ON DELETE CASCADE,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "AccessLevel" INT NOT NULL DEFAULT 1,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO "Users" ("Username", "Email", "PasswordHash", "FullName", "Role", "IsActive") 
VALUES ('admin', 'admin@standartdesk.local', 'salt$hash', 'Administrator', 2, true)
ON CONFLICT ("Username") DO NOTHING;
