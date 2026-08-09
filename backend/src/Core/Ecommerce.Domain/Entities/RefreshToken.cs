using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public bool IsRevoked { get; set; } = false;
    public DateTime ExpiresAtUtc { get; set; }

    public User User { get; set; } = null!;
}
