using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Coupon : BaseEntity<int>
{
    public string Code { get; set; } = string.Empty;
    public decimal? DiscountPercentage { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal MinimumSpend { get; set; } = 0;
    public DateTime ExpirationDate { get; set; }
    public int UsageLimit { get; set; } = 100;
    public int UsageCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
