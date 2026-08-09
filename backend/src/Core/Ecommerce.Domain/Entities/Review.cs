using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Review : BaseEntity<int>
{
    public Guid ProductId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; } // 1 to 5
    public string Comment { get; set; } = string.Empty;
    public bool IsApproved { get; set; } = true;

    public Product Product { get; set; } = null!;
    public User User { get; set; } = null!;
}
