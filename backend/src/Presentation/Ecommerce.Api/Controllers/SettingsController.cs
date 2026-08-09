using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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

    public SettingsController(IApplicationDbContext context)
    {
        _context = context;
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
            settings.SettingsJson = JsonSerializer.Serialize(request.Settings);
        }

        await _context.SaveChangesAsync();
        return Ok(new { isSuccess = true, message = "Settings updated successfully" });
    }
}
