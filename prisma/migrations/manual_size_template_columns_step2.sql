-- Step 2: Migrate existing SizeTemplateEntries data and drop the legacy fixed columns.
-- Run AFTER step 1.

BEGIN TRANSACTION;

IF EXISTS (SELECT * FROM sys.columns
           WHERE object_id = OBJECT_ID(N'[dbo].[SizeTemplateEntries]')
             AND name = 'Chest')
BEGIN
  -- Seed default columns for each legacy template (Topwear-style)
  DECLARE @tplId UNIQUEIDENTIFIER;
  DECLARE tpl_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT DISTINCT [SizeTemplateId] FROM [dbo].[SizeTemplateEntries];

  OPEN tpl_cursor;
  FETCH NEXT FROM tpl_cursor INTO @tplId;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM [dbo].[SizeTemplateColumns] WHERE [SizeTemplateId] = @tplId)
    BEGIN
      INSERT INTO [dbo].[SizeTemplateColumns] ([Id], [SizeTemplateId], [Name], [DisplayOrder], [CreatedAtUtc])
      VALUES
        (NEWID(), @tplId, N'Chest',   0, GETUTCDATE()),
        (NEWID(), @tplId, N'Length',  1, GETUTCDATE()),
        (NEWID(), @tplId, N'Waist',   2, GETUTCDATE()),
        (NEWID(), @tplId, N'Sleeve',  3, GETUTCDATE());
    END

    -- Backfill MeasurementsJson from existing fixed columns.
    -- Use dynamic SQL to defer parsing of MeasurementsJson.
    DECLARE @sql NVARCHAR(MAX) = N'
      UPDATE e
      SET e.[MeasurementsJson] =
        N''{"chest":"'' + ISNULL(e.[Chest],   N'''') + N''","'' +
        N''"length":"'' + ISNULL(e.[Length], N'''') + N''","'' +
        N''"waist":"''  + ISNULL(e.[Waist],  N'''') + N''","'' +
        N''"sleeve":"'' + ISNULL(e.[Sleeve], N'''') + N''"}''
      FROM [dbo].[SizeTemplateEntries] e
      WHERE e.[SizeTemplateId] = @pTplId;';
    EXEC sp_executesql @sql, N'@pTplId UNIQUEIDENTIFIER', @pTplId = @tplId;

    FETCH NEXT FROM tpl_cursor INTO @tplId;
  END

  CLOSE tpl_cursor;
  DEALLOCATE tpl_cursor;

  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Chest];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Length];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Waist];
  ALTER TABLE [dbo].[SizeTemplateEntries] DROP COLUMN [Sleeve];
END;

COMMIT TRANSACTION;
