using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Product : BaseEntity
{
    public int BrandId { get; set; }
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public bool IsFeatured { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public bool IsBundle { get; set; } = false;
    public string? BundleProducts { get; set; }
    public decimal AverageRating { get; set; } = 0;
    public int ReviewCount { get; set; } = 0;

    public Brand Brand { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
