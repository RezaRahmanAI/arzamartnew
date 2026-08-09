using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class LandingPage : BaseEntity<int>
{
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string HeroTitle { get; set; } = string.Empty;
    public string HeroSubtitle { get; set; } = string.Empty;
    public string HeroImageUrl { get; set; } = string.Empty;
    public string ContentJson { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
