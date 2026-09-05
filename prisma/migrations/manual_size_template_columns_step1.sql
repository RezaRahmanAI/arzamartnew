-- Migration to support fully customizable size template columns.
-- Run in a single transaction context; each step is idempotent.

BEGIN TRANSACTION;

-- 1. Create SizeTemplateColumns table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SizeTemplateColumns')
BEGIN
  CREATE TABLE [dbo].[SizeTemplateColumns] (
    [Id]             UNIQUEIDENTIFIER NOT NULL,
    [SizeTemplateId] UNIQUEIDENTIFIER NOT NULL,
    [Name]           NVARCHAR(100)    NOT NULL,
    [DisplayOrder]   INT              NOT NULL DEFAULT 0,
    [CreatedAtUtc]   DATETIME         NOT NULL DEFAULT (GETUTCDATE()),
    [UpdatedAtUtc]   DATETIME         NULL,
    CONSTRAINT [PK_SizeTemplateColumns] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_SizeTemplateColumns_SizeTemplates_SizeTemplateId]
      FOREIGN KEY ([SizeTemplateId]) REFERENCES [dbo].[SizeTemplates]([Id]) ON DELETE CASCADE
  );

  CREATE INDEX [IX_SizeTemplateColumns_Template_Order]
    ON [dbo].[SizeTemplateColumns]([SizeTemplateId], [DisplayOrder]);
END;

-- 2. Add MeasurementsJson column to SizeTemplateEntries
IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'[dbo].[SizeTemplateEntries]')
                 AND name = 'MeasurementsJson')
BEGIN
  ALTER TABLE [dbo].[SizeTemplateEntries]
    ADD [MeasurementsJson] NVARCHAR(MAX) NOT NULL DEFAULT N'{}';
END;

-- 3. Add ExtrasJson column to ProductVariants
IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'[dbo].[ProductVariants]')
                 AND name = 'ExtrasJson')
BEGIN
  ALTER TABLE [dbo].[ProductVariants]
    ADD [ExtrasJson] NVARCHAR(MAX) NULL;
END;

COMMIT TRANSACTION;
