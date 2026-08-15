using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Persistence.Context;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<ShippingMethod> ShippingMethods => Set<ShippingMethod>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<IncompleteOrder> IncompleteOrders => Set<IncompleteOrder>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<CustomLandingPageConfig> CustomLandingPageConfigs => Set<CustomLandingPageConfig>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<WebsiteSettings> WebsiteSettings => Set<WebsiteSettings>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("dbo");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.Entity<Product>(b =>
        {
            b.HasIndex(p => new { p.IsActive, p.CategoryId, p.CreatedAtUtc })
             .HasDatabaseName("IX_Products_IsActive_CategoryId_CreatedAtUtc");
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.HasIndex(o => new { o.OrderStatus, o.CreatedAtUtc })
             .HasDatabaseName("IX_Orders_OrderStatus_CreatedAtUtc");
        });

        modelBuilder.Entity<CustomLandingPageConfig>(b =>
        {
            b.HasIndex(c => c.ProductId)
             .HasDatabaseName("IX_CustomLandingPageConfigs_ProductId");
        });
    }
}
