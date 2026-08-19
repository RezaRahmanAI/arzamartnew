using System;
using System.Collections.Generic;

namespace Ecommerce.Application.DTOs;

public class CustomLandingPageConfigDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }

    public int? RelativeTimerTotalMinutes { get; set; }
    public bool IsTimerVisible { get; set; }
    public string? HeaderTitle { get; set; }

    public bool IsProductDetailsVisible { get; set; }
    public string? ProductDetailsTitle { get; set; }
    public bool IsFabricVisible { get; set; }
    public bool IsDesignVisible { get; set; }

    public bool IsTrustBannerVisible { get; set; }
    public string? TrustBannerText { get; set; }
    public string? TrustBannerDescription { get; set; }

    public bool IsFeaturedOrderVisible { get; set; }
    public string? FeaturedProductName { get; set; }
    public decimal? PromoPrice { get; set; }
    public decimal? OriginalPrice { get; set; }
    public string? SizePricesJson { get; set; }
    public string? PromoText { get; set; }
    public int? FreeShippingThresholdQuantity { get; set; }

    public bool IsMarqueeVisible { get; set; }
    public string? MarqueeText { get; set; }

    public string? CustomHeroImageUrl { get; set; }

    public string? SectionsJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CustomLandingPageConfigUpdateDto
{
    public Guid ProductId { get; set; }

    public int? RelativeTimerTotalMinutes { get; set; }
    public bool IsTimerVisible { get; set; } = true;
    public string? HeaderTitle { get; set; }

    public bool IsProductDetailsVisible { get; set; } = true;
    public string? ProductDetailsTitle { get; set; }
    public bool IsFabricVisible { get; set; } = true;
    public bool IsDesignVisible { get; set; } = true;

    public bool IsTrustBannerVisible { get; set; } = true;
    public string? TrustBannerText { get; set; }
    public string? TrustBannerDescription { get; set; }

    public bool IsFeaturedOrderVisible { get; set; } = true;
    public string? FeaturedProductName { get; set; }
    public decimal? PromoPrice { get; set; }
    public decimal? OriginalPrice { get; set; }
    public string? SizePricesJson { get; set; }
    public string? PromoText { get; set; }
    public int? FreeShippingThresholdQuantity { get; set; }

    public bool IsMarqueeVisible { get; set; } = true;
    public string? MarqueeText { get; set; }

    public string? CustomHeroImageUrl { get; set; }

    public string? SectionsJson { get; set; }
}

public class CustomLandingPageDataDto
{
    public object Product { get; set; } = null!;
    public CustomLandingPageConfigDto? Config { get; set; }
    public object? RelatedProducts { get; set; }
}
