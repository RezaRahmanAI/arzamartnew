using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class ShippingMethod : BaseEntity<int>
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal BaseCost { get; set; } = 60;
    public decimal FreeShippingThreshold { get; set; } = 1000;
    public bool IsActive { get; set; } = true;
}
