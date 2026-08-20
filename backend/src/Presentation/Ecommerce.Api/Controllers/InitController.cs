using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Products.Queries;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace Ecommerce.Api.Controllers;

public class InitResponseDto
{
    public object? Settings { get; set; }
    public List<Banner> Banners { get; set; } = new();
    public List<Category> Categories { get; set; } = new();
    public List<ProductDto> Products { get; set; } = new();
    public object Reviews { get; set; } = new();
}

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/v1/home")]
public class InitController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    public const string INIT_CACHE_KEY = "app_init_consolidated_cache_v1";

    public InitController(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetInitData(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(INIT_CACHE_KEY, out InitResponseDto? cachedData) && cachedData != null)
        {
            return Ok(cachedData);
        }

        // 1. Settings
        object? settingsObj = null;
        var settingsEntity = await _context.WebsiteSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (settingsEntity != null && !string.IsNullOrWhiteSpace(settingsEntity.SettingsJson))
        {
            try
            {
                settingsObj = JsonSerializer.Deserialize<object>(settingsEntity.SettingsJson);
            }
            catch
            {
                /* fallback */
            }
        }

        if (settingsObj == null && settingsEntity != null)
        {
            decimal.TryParse(settingsEntity.DeliveryInsideDhaka, out decimal insideRate);
            decimal.TryParse(settingsEntity.DeliveryOutsideDhaka, out decimal outsideRate);

            settingsObj = new
            {
                general = new
                {
                    websiteName = settingsEntity.SiteName,
                    websiteShortName = settingsEntity.SiteName,
                    currencySymbol = settingsEntity.CurrencySymbol,
                    supportEmail = settingsEntity.SupportEmail,
                    supportPhone = settingsEntity.SupportPhone,
                    address = "Dhaka, Bangladesh"
                },
                shipping = new
                {
                    insideDhakaRate = insideRate > 0 ? insideRate : 60,
                    outsideDhakaRate = outsideRate > 0 ? outsideRate : 120,
                    freeShippingThreshold = 5000,
                    enableFreeShipping = true
                }
            };
        }

        // 2. Banners
        var banners = await _context.Banners
            .AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.DisplayOrder)
            .ToListAsync(ct);

        // 3. Categories
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync(ct);

        // 4. Products (Top active products with images and variants)
        var productsQuery = _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(50);

        var products = await productsQuery
            .Select(p => new ProductDto(
                p.Id,
                p.Name,
                p.Slug,
                p.SKU,
                p.BasePrice,
                p.DiscountPrice,
                p.Images.Where(i => i.IsMain).Select(i => i.ImageUrl).FirstOrDefault() ?? p.Images.Select(i => i.ImageUrl).FirstOrDefault(),
                p.ShortDescription,
                p.FullDescription,
                p.Badge,
                p.PurchaseRate,
                p.Category != null ? p.Category.Name : "General",
                p.Brand != null ? p.Brand.Name : "Arza",
                p.AverageRating,
                p.ReviewCount,
                p.IsBundle,
                !string.IsNullOrWhiteSpace(p.BundleProducts) ? JsonSerializer.Deserialize<List<string>>(p.BundleProducts, (JsonSerializerOptions?)null) : null,
                p.Variants.Select(v => new ProductVariantDto(v.Id, v.Name, v.SKU, v.PriceOverride, v.StockQuantity)).ToList(),
                p.Images.OrderByDescending(i => i.IsMain).Select(i => i.ImageUrl).ToList()
            ))
            .ToListAsync(ct);

        // 5. Reviews
        var reviews = await _context.Reviews
            .AsNoTracking()
            .Where(r => r.IsApproved)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(20)
            .Select(r => new
            {
                id = r.Id.ToString(),
                productId = r.ProductId,
                productSlug = r.Product != null ? r.Product.Slug : "",
                productName = r.Product != null ? r.Product.Name : "",
                customerName = r.User != null ? (r.User.FirstName + " " + r.User.LastName).Trim() : "Customer",
                rating = r.Rating,
                comment = r.Comment,
                date = r.CreatedAtUtc.ToString("yyyy-MM-dd")
            })
            .ToListAsync(ct);

        var response = new InitResponseDto
        {
            Settings = settingsObj ?? new { },
            Banners = banners,
            Categories = categories,
            Products = products,
            Reviews = reviews
        };

        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromMinutes(10));

        _cache.Set(INIT_CACHE_KEY, response, cacheOptions);

        return Ok(response);
    }
}
