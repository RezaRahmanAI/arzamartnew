using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal? PriceOverride { get; set; }
    public int StockQuantity { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public Product Product { get; set; } = null!;
}
