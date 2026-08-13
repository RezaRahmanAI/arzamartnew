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
        builder.Property(c => c.Email).HasMaxLength(255);
        builder.Property(c => c.GoogleEmail).HasMaxLength(255);
        builder.Property(c => c.DefaultAddress).HasMaxLength(500);
        builder.Property(c => c.Area).HasMaxLength(200);
        builder.Property(c => c.District).HasMaxLength(100);
        builder.Property(c => c.PostalCode).HasMaxLength(20);
        builder.Property(c => c.DefaultNote).HasMaxLength(1000);
        builder.Property(c => c.PasswordHash).HasMaxLength(256);

        builder.HasOne(c => c.User)
               .WithOne()
               .HasForeignKey<Customer>(c => c.UserId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
