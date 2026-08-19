using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.DTOs;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/custom-landing-page")]
[Route("api/custom-landing-page")]
public class CustomLandingPageController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public CustomLandingPageController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Public endpoint: Get Landing Page Data by Product Slug or ID
    /// </summary>
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetData(string slug, CancellationToken ct = default)
    {
        var productQuery = _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Include(p => p.Category)
            .Include(p => p.Brand);

        Product? product = null;
        if (Guid.TryParse(slug, out var guidId))
        {
            product = await productQuery.FirstOrDefaultAsync(p => p.Id == guidId, ct);
        }
        
        if (product == null)
        {
            var cleanSlug = slug.Trim().ToLower();
            string productSlug = cleanSlug.EndsWith("-offer") ? cleanSlug[..^6] : cleanSlug;
            product = await productQuery.FirstOrDefaultAsync(p => 
                p.Slug.ToLower() == cleanSlug || 
                p.Slug.ToLower() == productSlug ||
                p.Name.ToLower() == cleanSlug ||
                p.SKU.ToLower() == cleanSlug, ct);
        }

        if (product == null)
        {
            return NotFound(new { message = "Product not found or inactive." });
        }

        var config = await _context.CustomLandingPageConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ProductId == product.Id, ct);

        CustomLandingPageConfigDto? configDto = null;
        if (config != null)
        {
            configDto = new CustomLandingPageConfigDto
            {
                Id = config.Id,
                ProductId = config.ProductId,
                RelativeTimerTotalMinutes = config.RelativeTimerTotalMinutes,
                IsTimerVisible = config.IsTimerVisible,
                HeaderTitle = config.HeaderTitle,
                IsProductDetailsVisible = config.IsProductDetailsVisible,
                ProductDetailsTitle = config.ProductDetailsTitle,
                IsFabricVisible = config.IsFabricVisible,
                IsDesignVisible = config.IsDesignVisible,
                IsTrustBannerVisible = config.IsTrustBannerVisible,
                TrustBannerText = config.TrustBannerText,
                TrustBannerDescription = config.TrustBannerDescription,
                IsFeaturedOrderVisible = config.IsFeaturedOrderVisible,
                FeaturedProductName = config.FeaturedProductName,
            PromoPrice = config.PromoPrice,
            OriginalPrice = config.OriginalPrice,
            SizePricesJson = config.SizePricesJson,
            PromoText = config.PromoText,
                FreeShippingThresholdQuantity = config.FreeShippingThresholdQuantity,
                IsMarqueeVisible = config.IsMarqueeVisible,
                MarqueeText = config.MarqueeText,
                CustomHeroImageUrl = config.CustomHeroImageUrl,
                CustomHeroDescription = config.CustomHeroDescription,
                SectionsJson = config.SectionsJson,
                CreatedAtUtc = config.CreatedAtUtc,
                UpdatedAtUtc = config.UpdatedAtUtc
            };
        }

        var relatedProducts = await _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Where(p => p.Id != product.Id && p.CategoryId == product.CategoryId && p.IsActive)
            .OrderBy(p => p.IsFeatured ? 0 : 1)
            .ThenByDescending(p => p.CreatedAtUtc)
            .Take(12)
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                slug = p.Slug,
                price = p.DiscountPrice ?? p.BasePrice,
                compareAtPrice = p.DiscountPrice.HasValue ? p.BasePrice : (decimal?)null,
                imageUrl = p.Images.Where(i => i.IsMain).Select(i => i.ImageUrl).FirstOrDefault() ?? p.Images.Select(i => i.ImageUrl).FirstOrDefault() ?? "",
                isFeatured = p.IsFeatured,
                variants = p.Variants.Select(v => new { id = v.Id, name = v.Name, priceOverride = v.PriceOverride, stockQuantity = v.StockQuantity })
            })
            .ToListAsync(ct);

        var productDto = new
        {
            id = product.Id,
            name = product.Name,
            slug = product.Slug,
            sku = product.SKU,
            description = product.FullDescription ?? product.ShortDescription ?? "",
            shortDescription = product.ShortDescription ?? "",
            price = product.DiscountPrice ?? product.BasePrice,
            compareAtPrice = product.DiscountPrice.HasValue ? product.BasePrice : (decimal?)null,
            basePrice = product.BasePrice,
            discountPrice = product.DiscountPrice,
            imageUrl = product.Images.Where(i => i.IsMain).Select(i => i.ImageUrl).FirstOrDefault() ?? product.Images.Select(i => i.ImageUrl).FirstOrDefault() ?? "",
            images = product.Images.Select(i => new { imageUrl = i.ImageUrl, isMain = i.IsMain }),
            variants = product.Variants.Select(v => new { id = v.Id, name = v.Name, sku = v.SKU, priceOverride = v.PriceOverride, stockQuantity = v.StockQuantity }),
            category = product.Category != null ? new { id = product.Category.Id, name = product.Category.Name, slug = product.Category.Slug } : null
        };

        return Ok(new CustomLandingPageDataDto
        {
            Product = productDto,
            Config = configDto,
            RelatedProducts = relatedProducts
        });
    }

    /// <summary>
    /// Admin endpoint: Get config by ProductId
    /// </summary>
    [HttpGet("admin/{productId:guid}")]
    public async Task<IActionResult> GetConfig(Guid productId, CancellationToken ct = default)
    {
        var config = await _context.CustomLandingPageConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ProductId == productId, ct);

        if (config == null) return Ok(null);

        var dto = new CustomLandingPageConfigDto
        {
            Id = config.Id,
            ProductId = config.ProductId,
            RelativeTimerTotalMinutes = config.RelativeTimerTotalMinutes,
            IsTimerVisible = config.IsTimerVisible,
            HeaderTitle = config.HeaderTitle,
            IsProductDetailsVisible = config.IsProductDetailsVisible,
            ProductDetailsTitle = config.ProductDetailsTitle,
            IsFabricVisible = config.IsFabricVisible,
            IsDesignVisible = config.IsDesignVisible,
            IsTrustBannerVisible = config.IsTrustBannerVisible,
            TrustBannerText = config.TrustBannerText,
            TrustBannerDescription = config.TrustBannerDescription,
            IsFeaturedOrderVisible = config.IsFeaturedOrderVisible,
            FeaturedProductName = config.FeaturedProductName,
            PromoPrice = config.PromoPrice,
            OriginalPrice = config.OriginalPrice,
            PromoText = config.PromoText,
            FreeShippingThresholdQuantity = config.FreeShippingThresholdQuantity,
            IsMarqueeVisible = config.IsMarqueeVisible,
            MarqueeText = config.MarqueeText,
            CustomHeroImageUrl = config.CustomHeroImageUrl,
            CustomHeroDescription = config.CustomHeroDescription,
            SectionsJson = config.SectionsJson,
            CreatedAtUtc = config.CreatedAtUtc,
            UpdatedAtUtc = config.UpdatedAtUtc
        };

        return Ok(dto);
    }

    /// <summary>
    /// Admin endpoint: Get all custom landing pages status overview
    /// </summary>
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllLandingPages(CancellationToken ct = default)
    {
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Category)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(ct);

        var configs = await _context.CustomLandingPageConfigs
            .AsNoTracking()
            .ToListAsync(ct);

        var configMap = configs.ToDictionary(c => c.ProductId);

        var result = products.Select(p =>
        {
            configMap.TryGetValue(p.Id, out var cfg);
            return new
            {
                productId = p.Id,
                name = p.Name,
                slug = p.Slug,
                category = p.Category?.Name ?? "Uncategorized",
                price = p.DiscountPrice ?? p.BasePrice,
                imageUrl = p.Images.FirstOrDefault(i => i.IsMain)?.ImageUrl ?? p.Images.FirstOrDefault()?.ImageUrl ?? "",
                hasCustomConfig = cfg != null,
                config = cfg != null ? new CustomLandingPageConfigDto
                {
                    Id = cfg.Id,
                    ProductId = cfg.ProductId,
                    RelativeTimerTotalMinutes = cfg.RelativeTimerTotalMinutes,
                    IsTimerVisible = cfg.IsTimerVisible,
                    HeaderTitle = cfg.HeaderTitle,
                    IsMarqueeVisible = cfg.IsMarqueeVisible,
                    MarqueeText = cfg.MarqueeText,
                    PromoText = cfg.PromoText,
                    CustomHeroImageUrl = cfg.CustomHeroImageUrl,
                    CustomHeroDescription = cfg.CustomHeroDescription,
                    SectionsJson = cfg.SectionsJson,
                    UpdatedAtUtc = cfg.UpdatedAtUtc
                } : null
            };
        });

        return Ok(result);
    }

    /// <summary>
    /// Admin endpoint: Save / Update Custom Landing Page Config
    /// </summary>
    [HttpPost("admin")]
    public async Task<IActionResult> SaveConfig([FromBody] CustomLandingPageConfigUpdateDto dto, CancellationToken ct = default)
    {
        if (dto.ProductId == Guid.Empty)
        {
            return BadRequest(new { message = "ProductId is required." });
        }

        var config = await _context.CustomLandingPageConfigs
            .FirstOrDefaultAsync(c => c.ProductId == dto.ProductId, ct);

        if (config == null)
        {
            config = new CustomLandingPageConfig
            {
                ProductId = dto.ProductId,
                RelativeTimerTotalMinutes = dto.RelativeTimerTotalMinutes,
                IsTimerVisible = dto.IsTimerVisible,
                HeaderTitle = dto.HeaderTitle,
                IsProductDetailsVisible = dto.IsProductDetailsVisible,
                ProductDetailsTitle = dto.ProductDetailsTitle,
                IsFabricVisible = dto.IsFabricVisible,
                IsDesignVisible = dto.IsDesignVisible,
                IsTrustBannerVisible = dto.IsTrustBannerVisible,
                TrustBannerText = dto.TrustBannerText,
                TrustBannerDescription = dto.TrustBannerDescription,
                IsFeaturedOrderVisible = dto.IsFeaturedOrderVisible,
                FeaturedProductName = dto.FeaturedProductName,
                PromoPrice = dto.PromoPrice,
                OriginalPrice = dto.OriginalPrice,
                SizePricesJson = dto.SizePricesJson,
                PromoText = dto.PromoText,
                FreeShippingThresholdQuantity = dto.FreeShippingThresholdQuantity,
                IsMarqueeVisible = dto.IsMarqueeVisible,
                MarqueeText = dto.MarqueeText,
                CustomHeroImageUrl = dto.CustomHeroImageUrl,
                CustomHeroDescription = dto.CustomHeroDescription,
                SectionsJson = dto.SectionsJson,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.CustomLandingPageConfigs.Add(config);
        }
        else
        {
            config.RelativeTimerTotalMinutes = dto.RelativeTimerTotalMinutes;
            config.IsTimerVisible = dto.IsTimerVisible;
            config.HeaderTitle = dto.HeaderTitle;
            config.IsProductDetailsVisible = dto.IsProductDetailsVisible;
            config.ProductDetailsTitle = dto.ProductDetailsTitle;
            config.IsFabricVisible = dto.IsFabricVisible;
            config.IsDesignVisible = dto.IsDesignVisible;
            config.IsTrustBannerVisible = dto.IsTrustBannerVisible;
            config.TrustBannerText = dto.TrustBannerText;
            config.TrustBannerDescription = dto.TrustBannerDescription;
            config.IsFeaturedOrderVisible = dto.IsFeaturedOrderVisible;
            config.FeaturedProductName = dto.FeaturedProductName;
            config.PromoPrice = dto.PromoPrice;
            config.OriginalPrice = dto.OriginalPrice;
            config.SizePricesJson = dto.SizePricesJson;
            config.PromoText = dto.PromoText;
            config.FreeShippingThresholdQuantity = dto.FreeShippingThresholdQuantity;
            config.IsMarqueeVisible = dto.IsMarqueeVisible;
            config.MarqueeText = dto.MarqueeText;
            config.CustomHeroImageUrl = dto.CustomHeroImageUrl;
            config.CustomHeroDescription = dto.CustomHeroDescription;
            config.SectionsJson = dto.SectionsJson;
            config.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);

        var resultDto = new CustomLandingPageConfigDto
        {
            Id = config.Id,
            ProductId = config.ProductId,
            RelativeTimerTotalMinutes = config.RelativeTimerTotalMinutes,
            IsTimerVisible = config.IsTimerVisible,
            HeaderTitle = config.HeaderTitle,
            IsProductDetailsVisible = config.IsProductDetailsVisible,
            ProductDetailsTitle = config.ProductDetailsTitle,
            IsFabricVisible = config.IsFabricVisible,
            IsDesignVisible = config.IsDesignVisible,
            IsTrustBannerVisible = config.IsTrustBannerVisible,
            TrustBannerText = config.TrustBannerText,
            TrustBannerDescription = config.TrustBannerDescription,
            IsFeaturedOrderVisible = config.IsFeaturedOrderVisible,
            FeaturedProductName = config.FeaturedProductName,
            PromoPrice = config.PromoPrice,
            OriginalPrice = config.OriginalPrice,
            SizePricesJson = config.SizePricesJson,
            PromoText = config.PromoText,
            FreeShippingThresholdQuantity = config.FreeShippingThresholdQuantity,
            IsMarqueeVisible = config.IsMarqueeVisible,
            MarqueeText = config.MarqueeText,
            CustomHeroImageUrl = config.CustomHeroImageUrl,
            CustomHeroDescription = config.CustomHeroDescription,
            SectionsJson = config.SectionsJson,
            CreatedAtUtc = config.CreatedAtUtc,
            UpdatedAtUtc = config.UpdatedAtUtc
        };

        return Ok(resultDto);
    }

    /// <summary>
    /// Admin endpoint: Delete/Reset Custom Landing Page Config
    /// </summary>
    [HttpDelete("admin/{productId:guid}")]
    public async Task<IActionResult> DeleteConfig(Guid productId, CancellationToken ct = default)
    {
        var config = await _context.CustomLandingPageConfigs
            .FirstOrDefaultAsync(c => c.ProductId == productId, ct);

        if (config == null)
        {
            return NotFound(new { message = "Custom landing page config not found." });
        }

        _context.CustomLandingPageConfigs.Remove(config);
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Custom landing page configuration reset to default successfully." });
    }
}
