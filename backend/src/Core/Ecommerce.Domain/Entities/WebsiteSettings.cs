using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class WebsiteSettings : BaseEntity<int>
{
    public string SiteName { get; set; } = "Arza Fashion";
    public string LogoUrl { get; set; } = "/images/logo.png";
    public string SupportEmail { get; set; } = "support@arza.com";
    public string SupportPhone { get; set; } = "01700000000";
    public string CurrencySymbol { get; set; } = "TK";

    // SEO Settings
    public string MetaTitle { get; set; } = "Arza Fashion | Modern E-Commerce Store";
    public string MetaDescription { get; set; } = "Shop everyday heavyweight cotton tees, linen shirts, and festive panjabi.";
    public string Keywords { get; set; } = "fashion, clothing, dhaka, Bangladesh, tees, shirts";

    // Social Media Links
    public string FacebookUrl { get; set; } = "https://facebook.com";
    public string InstagramUrl { get; set; } = "https://instagram.com";
    public string YoutubeUrl { get; set; } = "https://youtube.com";

    // Footer Text
    public string FooterCopyright { get; set; } = "© 2026 Arza Fashion. All rights reserved.";
    public string DeliveryInsideDhaka { get; set; } = "60";
    public string DeliveryOutsideDhaka { get; set; } = "120";

    // Full JSON store for all System Settings sections
    public string SettingsJson { get; set; } = string.Empty;
}
