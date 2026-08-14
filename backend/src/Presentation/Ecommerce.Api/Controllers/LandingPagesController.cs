using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LandingPagesController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public LandingPagesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var pages = await _context.LandingPages
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync();
        return Ok(pages);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var page = await _context.LandingPages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);

        if (page != null)
        {
            object? product = null;
            if (page.ProductId.HasValue)
            {
                var rawProduct = await _context.Products
                    .Include(p => p.Images)
                    .Include(p => p.Variants)
                    .Include(p => p.Category)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == page.ProductId.Value);

                if (rawProduct != null)
                {
                    product = new
                    {
                        id = rawProduct.Id,
                        name = rawProduct.Name,
                        slug = rawProduct.Slug,
                        basePrice = rawProduct.BasePrice,
                        discountPrice = rawProduct.DiscountPrice,
                        images = rawProduct.Images.Select(i => new { imageUrl = i.ImageUrl, isMain = i.IsMain }),
                        variants = rawProduct.Variants.Select(v => new { id = v.Id, name = v.Name, sku = v.SKU, priceOverride = v.PriceOverride, stockQuantity = v.StockQuantity }),
                        category = rawProduct.Category != null ? new { name = rawProduct.Category.Name } : null,
                    };
                }
            }

            return Ok(new { landingPage = page, product });
        }

        // Automatic Product Fallback for Standard Landing Pages
        string productSlug = slug.EndsWith("-offer") ? slug[..^6] : slug;
        Product? fallbackProduct = null;
        if (Guid.TryParse(slug, out var parsedId))
        {
            fallbackProduct = await _context.Products
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .Include(p => p.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == parsedId && p.IsActive);
        }

        if (fallbackProduct == null)
        {
            fallbackProduct = await _context.Products
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .Include(p => p.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => (p.Slug == slug || p.Slug == productSlug) && p.IsActive);
        }

        if (fallbackProduct == null)
        {
            return NotFound(new { message = "Landing page not found." });
        }

        var defaultPage = new LandingPage
        {
            ProductId = fallbackProduct.Id,
            Title = fallbackProduct.Name,
            Subtitle = fallbackProduct.ShortDescription ?? $"{fallbackProduct.Name} — প্রিমিয়াম কোয়ালিটি, সেরা দামে",
            Slug = fallbackProduct.Slug,
            HeroTitle = fallbackProduct.Name,
            HeroSubtitle = fallbackProduct.ShortDescription ?? "সেরা মানের প্রিমিয়াম ফেব্রিক ও স্টাইলিশ ডিজাইন। এখনই অর্ডার করুন!",
            HeroImageUrl = fallbackProduct.Images.FirstOrDefault(i => i.IsMain)?.ImageUrl ?? fallbackProduct.Images.FirstOrDefault()?.ImageUrl ?? "",
            SpecialPrice = fallbackProduct.DiscountPrice ?? fallbackProduct.BasePrice,
            OldPrice = fallbackProduct.DiscountPrice.HasValue ? fallbackProduct.BasePrice : 0,
            DeliveryCharge = 70,
            CallButtonText = "অর্ডার করুন",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var fallbackProductDto = new
        {
            id = fallbackProduct.Id,
            name = fallbackProduct.Name,
            slug = fallbackProduct.Slug,
            basePrice = fallbackProduct.BasePrice,
            discountPrice = fallbackProduct.DiscountPrice,
            images = fallbackProduct.Images.Select(i => new { imageUrl = i.ImageUrl, isMain = i.IsMain }),
            variants = fallbackProduct.Variants.Select(v => new { id = v.Id, name = v.Name, sku = v.SKU, priceOverride = v.PriceOverride, stockQuantity = v.StockQuantity }),
            category = fallbackProduct.Category != null ? new { name = fallbackProduct.Category.Name } : null,
        };

        return Ok(new { landingPage = defaultPage, product = fallbackProductDto });
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetByProductId(Guid productId)
    {
        var page = await _context.LandingPages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.ProductId == productId);

        if (page == null) return NotFound(new { message = "Landing page configuration not found for this product." });

        return Ok(page);
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] LandingPage model)
    {
        if (string.IsNullOrWhiteSpace(model.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        if (string.IsNullOrWhiteSpace(model.Slug))
        {
            model.Slug = model.Title.ToLower().Replace(" ", "-");
        }

        if (model.Id == 0)
        {
            model.CreatedAtUtc = DateTime.UtcNow;
            _context.LandingPages.Add(model);
        }
        else
        {
            var existing = await _context.LandingPages.FindAsync(model.Id);
            if (existing == null) return NotFound();

            existing.Title = model.Title;
            existing.Subtitle = model.Subtitle;
            existing.Slug = model.Slug;
            existing.HeroTitle = model.HeroTitle;
            existing.HeroSubtitle = model.HeroSubtitle;
            existing.HeroImageUrl = model.HeroImageUrl;
            existing.VideoUrl = model.VideoUrl;
            existing.ContentJson = model.ContentJson;
            existing.SectionsJson = model.SectionsJson;
            existing.ReviewsJson = model.ReviewsJson;
            existing.SpecialPrice = model.SpecialPrice;
            existing.OldPrice = model.OldPrice;
            existing.DeliveryCharge = model.DeliveryCharge;
            existing.CallButtonText = model.CallButtonText;
            existing.IsActive = model.IsActive;
            existing.ProductId = model.ProductId;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(default);
        return Ok(model);
    }

    [HttpDelete("{id}")]
    [HttpPost("delete/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var page = await _context.LandingPages.FindAsync(id);
        if (page == null) return NotFound(new { message = "Landing page not found." });

        _context.LandingPages.Remove(page);
        await _context.SaveChangesAsync(default);
        return Ok(new { message = "Landing page deleted successfully." });
    }
}
