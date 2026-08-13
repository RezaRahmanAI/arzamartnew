using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(250);
        builder.Property(p => p.Slug).IsRequired().HasMaxLength(280);
        builder.HasIndex(p => p.Slug).IsUnique();

        builder.Property(p => p.SKU).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.SKU).IsUnique();

        builder.Property(p => p.BasePrice).HasColumnType("decimal(18,4)");
        builder.Property(p => p.DiscountPrice).HasColumnType("decimal(18,4)");
        builder.Property(p => p.AverageRating).HasColumnType("decimal(3,2)");
        builder.Property(p => p.BundleProducts).HasMaxLength(2000);
        builder.Property(p => p.PurchaseRate).HasColumnType("decimal(18,4)").HasDefaultValue(0m);
        builder.Property(p => p.Badge).HasMaxLength(100);

        builder.HasIndex(p => new { p.CategoryId, p.BasePrice })
               .IncludeProperties(p => new { p.Name, p.Slug, p.DiscountPrice, p.IsActive });

        builder.HasOne(p => p.Brand)
               .WithMany(b => b.Products)
               .HasForeignKey(p => p.BrandId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Category)
               .WithMany(c => c.Products)
               .HasForeignKey(p => p.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
