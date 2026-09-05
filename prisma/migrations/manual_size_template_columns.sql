-- Migration to support fully customizable size template columns.
-- Adds SizeTemplateColumns table and replaces fixed Chest/Length/Waist/Sleeve
-- columns on SizeTemplateEntries with a flexible MeasurementsJson payload.

BEGIN TRANSACTION;

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

-- Add MeasurementsJson column if it doesn't already exist
IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'[dbo].[SizeTemplateEntries]')
                 AND name = 'MeasurementsJson')
BEGIN
  ALTER TABLE [dbo].[SizeTemplateEntries]
    ADD [MeasurementsJson] NVARCHAR(MAX) NOT NULL DEFAULT N'{}';
END;

-- Drop the old fixed columns if they still exist (preserve existing values in JSON)
IF EXISTS (SELECT * FROM sys.columns
           WHERE object_id = OBJECT_ID(N'[dbo].[SizeTemplateEntries]')
             AND name = 'Chest')
BEGIN
  -- Migrate existing values into MeasurementsJson so nothing is lost
  DECLARE @tplId UNIQUEIDENTIFIER;
  DECLARE tpl_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT DISTINCT [SizeTemplateId] FROM [dbo].[SizeTemplateEntries];

  OPEN tpl_cursor;
  FETCH NEXT FROM tpl_cursor INTO @tplId;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    -- Seed default columns for legacy templates (Topwear-style)
    IF NOT EXISTS (SELECT 1 FROM [dbo].[SizeTemplateColumns] WHERE [SizeTemplateId] = @tplId)
    BEGIN
      INSERT INTO [dbo].[SizeTemplateColumns] ([Id], [SizeTemplateId], [Name], [DisplayOrder], [CreatedAtUtc])
      VALUES
        (NEWID(), @tplId, N'Chest',   0, GETUTCDATE()),
        (NEWID(), @tplId, N'Length',  1, GETUTCDATE()),
        (NEWID(), @tplId, N'Waist',   2, GETUTCDATE()),
        (NEWID(), @tplId, N'Sleeve',  3, GETUTCDATE());
    END

    -- Backfill MeasurementsJson from existing fixed columns
    UPDATE e
    SET e.[MeasurementsJson] =
      N'{"chest":"' + ISNULL(e.[Chest],   N'') + N'",' +
      N'"length":"' + ISNULL(e.[Length], N'') + N'",' +
      N'"waist":"' + ISNULL(e.[Waist],  N'') + N'",' +
      N'"sleeve":"' + ISNULL(e.[Sleeve], N'') + N'"}'
    FROM [dbo].[SizeTemplateEntries] e
    WHERE e.[SizeTemplateId] = @tplId;

    FETCH NEXT FROM tpl_cursor INTO @tplId;
  END

  CLOSE tpl_cursor;
  DEALLOCATE tpl_cursor;

  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Chest];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Length];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Waist];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Sleeve];
END;

-- Add ExtrasJson column to ProductVariants for any user-defined measurement columns
IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'[dbo].[ProductVariants]')
                 AND name = 'ExtrasJson')
BEGIN
  ALTER TABLE [dbo].[ProductVariants]
    ADD [ExtrasJson] NVARCHAR(MAX) NULL;
END;

COMMIT TRANSACTION;