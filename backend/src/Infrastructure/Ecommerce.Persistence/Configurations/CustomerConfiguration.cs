using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.FullName).IsRequired().HasMaxLength(150);
        builder.Property(c => c.Phone).IsRequired().HasMaxLength(20);
        builder.HasIndex(c => c.Phone).IsUnique();

        builder.HasOne(c => c.User)
               .WithOne()
               .HasForeignKey<Customer>(c => c.UserId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
