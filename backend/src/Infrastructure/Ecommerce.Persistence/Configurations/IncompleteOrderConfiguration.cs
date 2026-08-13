using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Persistence.Configurations;

public class IncompleteOrderConfiguration : IEntityTypeConfiguration<IncompleteOrder>
{
    public void Configure(EntityTypeBuilder<IncompleteOrder> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.OrderId).IsRequired().HasMaxLength(64);
        builder.Property(o => o.Phone).HasMaxLength(32);
        builder.Property(o => o.OrderJson).HasColumnType("nvarchar(max)");
        builder.HasIndex(o => o.OrderId).IsUnique();
    }
}