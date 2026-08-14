using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Customer> Customers { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Brand> Brands { get; }
    DbSet<Category> Categories { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductVariant> ProductVariants { get; }
    DbSet<ProductImage> ProductImages { get; }
    DbSet<Inventory> Inventories { get; }
    DbSet<ShippingMethod> ShippingMethods { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<IncompleteOrder> IncompleteOrders { get; }
    DbSet<Coupon> Coupons { get; }
    DbSet<Review> Reviews { get; }
    DbSet<WishlistItem> WishlistItems { get; }
    DbSet<Banner> Banners { get; }
    DbSet<WebsiteSettings> WebsiteSettings { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
