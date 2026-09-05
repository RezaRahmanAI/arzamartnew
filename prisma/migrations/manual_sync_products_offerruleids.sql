-- ========================================================================
-- Manual Migration: Sync Products table to current Prisma schema
-- Target DB: SQL Server
-- Run order: Apply each ALTER TABLE statement individually.
-- Idempotent guard: IF NOT EXISTS check on column via INFORMATION_SCHEMA.
-- ========================================================================

-- 1) OfferRuleIds (the immediate blocker — new offer-rule feature column)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'OfferRuleIds'
)
BEGIN
  ALTER TABLE [Products]
    ADD [OfferRuleIds] NVARCHAR(Max) NULL;
  PRINT 'Added Products.OfferRuleIds';
END
GO

-- 2) SizeTemplateId (already exists in your schema reference; safe-add in case missing)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'SizeTemplateId'
)
BEGIN
  ALTER TABLE [Products]
    ADD [SizeTemplateId] UNIQUEIDENTIFIER NULL;
  PRINT 'Added Products.SizeTemplateId';
END
GO

-- 3) BundleProducts (nullable column for combo product slugs)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'BundleProducts'
)
BEGIN
  ALTER TABLE [Products]
    ADD [BundleProducts] NVARCHAR(2000) NULL;
  PRINT 'Added Products.BundleProducts';
END
GO

-- 4) Optional FK constraint for SizeTemplateId (only if SizeTemplates table exists)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SizeTemplates')
   AND NOT EXISTS (
     SELECT 1 FROM sys.foreign_keys
     WHERE name = 'FK_Products_SizeTemplates_SizeTemplateId'
   )
   AND EXISTS (
     SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'SizeTemplateId'
   )
BEGIN
  ALTER TABLE [Products]
    ADD CONSTRAINT [FK_Products_SizeTemplates_SizeTemplateId]
    FOREIGN KEY ([SizeTemplateId]) REFERENCES [SizeTemplates]([Id])
    ON DELETE SET NULL;
  PRINT 'Added FK Products.SizeTemplateId -> SizeTemplates.Id';
END
GO

-- 5) Indexes (only if missing)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Products_IsActive_CategoryId_CreatedAtUtc')
BEGIN
  CREATE NONCLUSTERED INDEX [IX_Products_IsActive_CategoryId_CreatedAtUtc]
    ON [Products] ([IsActive], [CategoryId], [CreatedAtUtc]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Products_CategoryId_BasePrice')
BEGIN
  CREATE NONCLUSTERED INDEX [IX_Products_CategoryId_BasePrice]
    ON [Products] ([CategoryId], [BasePrice]);
END
GO

PRINT 'Products table sync complete.';