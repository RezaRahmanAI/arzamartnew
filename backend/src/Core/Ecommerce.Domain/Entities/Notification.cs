using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Notification : BaseEntity<int>
{
    public Guid? UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;

    public User? User { get; set; }
}
