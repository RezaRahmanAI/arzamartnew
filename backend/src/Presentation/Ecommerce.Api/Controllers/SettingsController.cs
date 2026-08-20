using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

using Microsoft.Extensions.Caching.Memory;

namespace Ecommerce.Api.Controllers;

public class UpdateSettingsRequest
{
    public object? Settings { get; set; }
    public string? User { get; set; }
}

[ApiController]
[Route("api/v1/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public SettingsController(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.WebsiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            return Ok(new { settings = new { } });
        }

        if (!string.IsNullOrWhiteSpace(settings.SettingsJson))
        {
            try
            {
                var settingsObj = JsonSerializer.Deserialize<object>(settings.SettingsJson);
                if (settingsObj != null)
                {
                    return Ok(new { settings = settingsObj });
                }
            }
            catch
            {
                /* fallback to entity fields */
            }
        }

        return Ok(new
        {
            settings = new
            {
                general = new
                {
                    websiteName = settings.SiteName,
                    websiteShortName = settings.SiteName,
                    currencySymbol = settings.CurrencySymbol,
                    supportEmail = settings.SupportEmail,
                    supportPhone = settings.SupportPhone,
                },
                branding = new
                {
                    headerLogo = settings.LogoUrl,
                },
                seo = new
                {
                    defaultMetaTitle = settings.MetaTitle,
                    defaultMetaDescription = settings.MetaDescription,
                    metaKeywords = settings.Keywords,
                },
                socialMedia = new
                {
                    facebookUrl = settings.FacebookUrl,
                    instagramUrl = settings.InstagramUrl,
                    youtubeUrl = settings.YoutubeUrl,
                },
                footer = new
                {
                    copyrightText = settings.FooterCopyright,
                },
                shipping = new
                {
                    deliveryInsideDhaka = settings.DeliveryInsideDhaka,
                    deliveryOutsideDhaka = settings.DeliveryOutsideDhaka,
                }
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        var settings = await _context.WebsiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new WebsiteSettings();
            _context.WebsiteSettings.Add(settings);
        }

        if (request.Settings != null)
        {
            var jsonString = JsonSerializer.Serialize(request.Settings);
            settings.SettingsJson = jsonString;

            try
            {
                using var doc = JsonDocument.Parse(jsonString);
                var root = doc.RootElement;

                if (root.TryGetProperty("general", out var gen))
                {
                    if (gen.TryGetProperty("websiteName", out var name) && name.ValueKind == JsonValueKind.String)
                        settings.SiteName = name.GetString() ?? settings.SiteName;
                    if (gen.TryGetProperty("currencySymbol", out var curr) && curr.ValueKind == JsonValueKind.String)
                        settings.CurrencySymbol = curr.GetString() ?? settings.CurrencySymbol;
                }

                if (root.TryGetProperty("contact", out var contact))
                {
                    if (contact.TryGetProperty("supportEmail", out var email) && email.ValueKind == JsonValueKind.String)
                        settings.SupportEmail = email.GetString() ?? settings.SupportEmail;
                    if (contact.TryGetProperty("supportPhone", out var phone) && phone.ValueKind == JsonValueKind.String)
                        settings.SupportPhone = phone.GetString() ?? settings.SupportPhone;
                }

                if (root.TryGetProperty("branding", out var branding))
                {
                    if (branding.TryGetProperty("headerLogo", out var logo) && logo.ValueKind == JsonValueKind.String)
                        settings.LogoUrl = logo.GetString() ?? settings.LogoUrl;
                }

                if (root.TryGetProperty("seo", out var seo))
                {
                    if (seo.TryGetProperty("defaultMetaTitle", out var title) && title.ValueKind == JsonValueKind.String)
                        settings.MetaTitle = title.GetString() ?? settings.MetaTitle;
                    if (seo.TryGetProperty("defaultMetaDescription", out var desc) && desc.ValueKind == JsonValueKind.String)
                        settings.MetaDescription = desc.GetString() ?? settings.MetaDescription;
                    if (seo.TryGetProperty("metaKeywords", out var keys) && keys.ValueKind == JsonValueKind.String)
                        settings.Keywords = keys.GetString() ?? settings.Keywords;
                }

                if (root.TryGetProperty("footer", out var footer))
                {
                    if (footer.TryGetProperty("copyrightText", out var copy) && copy.ValueKind == JsonValueKind.String)
                        settings.FooterCopyright = copy.GetString() ?? settings.FooterCopyright;
                }
            }
            catch
            {
                /* ignore parsing sync errors */
            }
        }

        await _context.SaveChangesAsync();
        _cache.Remove(InitController.INIT_CACHE_KEY);
        return Ok(new { isSuccess = true, message = "Settings updated successfully" });
    }
}
