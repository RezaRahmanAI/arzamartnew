using System;
using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class CustomLandingPageConfig : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    // Header / Timer Section
    public int? RelativeTimerTotalMinutes { get; set; } = 120;
    public bool IsTimerVisible { get; set; } = true;
    public string? HeaderTitle { get; set; } = "অফারটি শেষ হতে মাত্র কিছুক্ষণ বাকি আছে!";

    // Product Details Section
    public bool IsProductDetailsVisible { get; set; } = true;
    public string? ProductDetailsTitle { get; set; } = "🔥 প্রোডাক্ট ডিটেইলস";
    public bool IsFabricVisible { get; set; } = true;
    public bool IsDesignVisible { get; set; } = true;

    // Trust Banner
    public bool IsTrustBannerVisible { get; set; } = true;
    public string? TrustBannerText { get; set; } = "দেখে চেক করে রিসিভ করতে পারবেন। পছন্দ না হলে ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিতে পারবেন সহজেই।";
    public string? TrustBannerDescription { get; set; }

    // Configuration / Form Section
    public bool IsFeaturedOrderVisible { get; set; } = true;
    public string? FeaturedProductName { get; set; }
    public decimal? PromoPrice { get; set; }
    public decimal? OriginalPrice { get; set; }
    public string? SizePricesJson { get; set; }
    public string? PromoText { get; set; }
    public int? FreeShippingThresholdQuantity { get; set; }

    // Marquee
    public bool IsMarqueeVisible { get; set; } = true;
    public string? MarqueeText { get; set; } = "🔥 সীমিত স্টক — মাত্র ৩৪টি বাকি! 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি 💥 আজকের জন্য বিশেষ ছাড় ⚡";

    // Product Details / Custom Hero Image & Content Override
    public string? CustomHeroImageUrl { get; set; }
    public string? CustomHeroDescription { get; set; }

    // Dynamic Sections JSON
    public string? SectionsJson { get; set; }
}
