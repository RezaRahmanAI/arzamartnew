using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Inventory : BaseEntity<int>
{
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string WarehouseLocation { get; set; } = "Main Warehouse";
    public int AvailableQuantity { get; set; } = 0;
    public int ReservedQuantity { get; set; } = 0;
    public int ReorderLevel { get; set; } = 10;

    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}
