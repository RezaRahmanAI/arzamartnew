using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class ProductImage : BaseEntity<int>
{
    public Guid ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;
    public bool IsMain { get; set; } = false;

    public Product Product { get; set; } = null!;
}
