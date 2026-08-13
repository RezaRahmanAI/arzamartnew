using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class LandingPage : BaseEntity<int>
{
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string HeroTitle { get; set; } = string.Empty;
    public string HeroSubtitle { get; set; } = string.Empty;
    public string HeroImageUrl { get; set; } = string.Empty;
    public string? VideoUrl { get; set; }
    public string ContentJson { get; set; } = string.Empty;
    public string? SectionsJson { get; set; }
    public string? ReviewsJson { get; set; }
    public decimal SpecialPrice { get; set; }
    public decimal OldPrice { get; set; }
    public decimal DeliveryCharge { get; set; } = 60;
    public string CallButtonText { get; set; } = "অর্ডার করুন";
    public bool IsActive { get; set; } = true;
}
