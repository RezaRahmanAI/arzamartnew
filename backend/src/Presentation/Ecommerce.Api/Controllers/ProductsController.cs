using Ecommerce.Application.Features.Products.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ISender _mediator;

    public ProductsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 12, [FromQuery] string? search = null, [FromQuery] int? categoryId = null)
    {
        var result = await _mediator.Send(new GetProductsPagedQuery(pageIndex, pageSize, search, categoryId));
        return Ok(result);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetProductBySlug(string slug)
    {
        var result = await _mediator.Send(new GetProductBySlugQuery(slug));
        return result.IsSuccess ? Ok(result) : NotFound(result);
    }

    public record UpdateProductDto(
        string? Name,
        string? Category,
        decimal? Price,
        decimal? CompareAt,
        decimal? Mrp,
        List<string>? Sizes,
        Dictionary<string, decimal>? SizePrices,
        Dictionary<string, int>? SizeStock,
        string? Description,
        string? Image,
        List<string>? Images,
        bool? IsActive,
        bool? IsBundle,
        List<string>? BundleProducts,
        decimal? PurchaseRate,
        string? Badge
    );

    [HttpPut("{slug}")]
    [HttpPatch("{slug}")]
    public async Task<IActionResult> UpdateProduct(string slug, [FromBody] UpdateProductDto dto, [FromServices] Ecommerce.Application.Common.Interfaces.IApplicationDbContext dbContext)
    {
        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (product == null)
        {
            return NotFound(new { Message = $"Product with slug '{slug}' not found." });
        }

        if (dto != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.Name)) product.Name = dto.Name.Trim();
            if (dto.Price.HasValue) product.DiscountPrice = dto.Price.Value;
            if (dto.Mrp.HasValue) product.BasePrice = dto.Mrp.Value;
            if (!string.IsNullOrWhiteSpace(dto.Description)) product.ShortDescription = dto.Description;
            if (!string.IsNullOrWhiteSpace(dto.Description)) product.FullDescription = dto.Description;
            if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;
            if (dto.PurchaseRate.HasValue) product.PurchaseRate = dto.PurchaseRate.Value;
            if (dto.Badge != null) product.Badge = dto.Badge.Trim();
            if (dto.IsBundle.HasValue)
            {
                product.IsBundle = dto.IsBundle.Value;
                product.BundleProducts = dto.IsBundle.Value && dto.BundleProducts != null && dto.BundleProducts.Count > 0
                    ? string.Join(',', dto.BundleProducts.Select(b => b.Trim()).Where(b => !string.IsNullOrWhiteSpace(b)))
                    : null;
            }

            // Re-map category if provided (frontend sends the category slug)
            if (!string.IsNullOrWhiteSpace(dto.Category))
            {
                var catSlug = dto.Category.Trim().ToLower();
                var category = await dbContext.Categories
                    .FirstOrDefaultAsync(c => c.Slug == catSlug || c.Name.ToLower() == catSlug);
                if (category != null)
                {
                    product.CategoryId = category.Id;
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.Image))
            {
                var existingMain = await dbContext.ProductImages
                    .FirstOrDefaultAsync(i => i.ProductId == product.Id && i.IsMain);
                if (existingMain != null)
                {
                    existingMain.ImageUrl = dto.Image;
                }
                else
                {
                    dbContext.ProductImages.Add(new Ecommerce.Domain.Entities.ProductImage
                    {
                        ProductId = product.Id,
                        ImageUrl = dto.Image,
                        IsMain = true,
                        DisplayOrder = 1
                    });
                }
                if (dto.Images != null && dto.Images.Count > 0)
                {
                    foreach (var (imgUrl, idx) in dto.Images.Select((u, i) => (u, i)).Where(x => !string.IsNullOrWhiteSpace(x.u)))
                    {
                        var existingGallery = await dbContext.ProductImages
                            .FirstOrDefaultAsync(i => i.ProductId == product.Id && !i.IsMain && i.DisplayOrder == idx + 2);
                        if (existingGallery != null)
                        {
                            existingGallery.ImageUrl = imgUrl;
                        }
                        else
                        {
                            dbContext.ProductImages.Add(new Ecommerce.Domain.Entities.ProductImage
                            {
                                ProductId = product.Id,
                                ImageUrl = imgUrl,
                                IsMain = false,
                                DisplayOrder = idx + 2
                            });
                        }
                    }
                }
            }

            if (dto.SizeStock != null && dto.SizeStock.Count > 0)
            {
                var existingVariants = await dbContext.ProductVariants
                    .Where(v => v.ProductId == product.Id)
                    .ToListAsync();

                foreach (var (sizeName, qty) in dto.SizeStock)
                {
                    var variant = existingVariants.FirstOrDefault(v => v.Name.Equals(sizeName, StringComparison.OrdinalIgnoreCase) || v.Name.Equals($"Size: {sizeName}", StringComparison.OrdinalIgnoreCase));
                    if (variant != null)
                    {
                        variant.StockQuantity = Math.Max(0, qty);
                    }
                    else
                    {
                        dbContext.ProductVariants.Add(new Ecommerce.Domain.Entities.ProductVariant
                        {
                            ProductId = product.Id,
                            Name = sizeName,
                            SKU = string.IsNullOrWhiteSpace(product.SKU) ? $"SKU-{sizeName}" : $"{product.SKU}-{sizeName}",
                            PriceOverride = dto.SizePrices != null && dto.SizePrices.TryGetValue(sizeName, out var pOverride) ? pOverride : product.BasePrice,
                            StockQuantity = Math.Max(0, qty),
                            IsActive = true
                        });
                    }
                }
            }

            // Sync selling prices for existing variants when size-wise prices provided
            if (dto.SizePrices != null && dto.SizePrices.Count > 0)
            {
                var existingVariants = await dbContext.ProductVariants
                    .Where(v => v.ProductId == product.Id)
                    .ToListAsync();
                foreach (var (sizeName, price) in dto.SizePrices)
                {
                    var variant = existingVariants.FirstOrDefault(v => v.Name.Equals(sizeName, StringComparison.OrdinalIgnoreCase) || v.Name.Equals($"Size: {sizeName}", StringComparison.OrdinalIgnoreCase));
                    if (variant != null)
                    {
                        variant.PriceOverride = price;
                    }
                }
            }

            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // In case of stale tracking, SaveChanges safely
            }
        }

        return Ok(new { success = true, slug });
    }

    public record CreateProductDto(
        string? Slug,
        string? Name,
        string? Category,
        decimal? Price,
        decimal? CompareAt,
        decimal? Mrp,
        string? Image,
        List<string>? Sizes,
        List<string>? Colors,
        string? Description,
        string? Badge,
        decimal? PurchaseRate,
        Dictionary<string, decimal>? SizePrices,
        Dictionary<string, int>? SizeStock,
        string? VideoUrl,
        string? ReturnPolicy,
        List<string>? Images,
        bool IsBundle = false,
        List<string>? BundleProducts = null,
        bool IsActive = true
    );

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto, [FromServices] Ecommerce.Application.Common.Interfaces.IApplicationDbContext dbContext)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { Message = "Product name is required." });
        }

        var slug = string.IsNullOrWhiteSpace(dto.Slug)
            ? dto.Name.Trim().ToLower().Replace(" ", "-")
            : dto.Slug.Trim().ToLower();

        if (await dbContext.Products.AnyAsync(p => p.Slug == slug))
        {
            return BadRequest(new { Message = $"A product with slug '{slug}' already exists." });
        }

        var categorySlug = string.IsNullOrWhiteSpace(dto.Category) ? "t-shirts" : dto.Category.Trim().ToLower();
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(c => c.Slug == categorySlug || c.Name.ToLower() == categorySlug);
        if (category == null)
        {
            category = new Ecommerce.Domain.Entities.Category
            {
                Name = dto.Category?.Trim() ?? "General",
                Slug = string.IsNullOrWhiteSpace(dto.Category) ? "general" : slug,
                DisplayOrder = 0,
                IsActive = true
            };
            dbContext.Categories.Add(category);
            await dbContext.SaveChangesAsync();
        }

        var brand = await dbContext.Brands.FirstOrDefaultAsync();
        if (brand == null)
        {
            brand = new Ecommerce.Domain.Entities.Brand
            {
                Name = "General Brand",
                Slug = "general-brand",
                IsActive = true
            };
            dbContext.Brands.Add(brand);
            await dbContext.SaveChangesAsync();
        }

        var basePrice = dto.Mrp ?? dto.CompareAt ?? dto.Price ?? 0;
        var product = new Ecommerce.Domain.Entities.Product
        {
            BrandId = brand.Id,
            CategoryId = category.Id,
            Name = dto.Name.Trim(),
            Slug = slug,
            SKU = $"SKU-{Guid.NewGuid():N}".ToUpper().Substring(0, 20),
            ShortDescription = string.IsNullOrWhiteSpace(dto.Description) ? "No description yet." : dto.Description.Trim(),
            FullDescription = string.IsNullOrWhiteSpace(dto.Description) ? "" : dto.Description.Trim(),
            BasePrice = basePrice,
            DiscountPrice = dto.Price,
            IsFeatured = false,
            IsActive = dto.IsActive,
            IsBundle = dto.IsBundle,
            BundleProducts = dto.IsBundle && dto.BundleProducts != null && dto.BundleProducts.Count > 0
                ? string.Join(',', dto.BundleProducts.Select(b => b.Trim()).Where(b => !string.IsNullOrWhiteSpace(b)))
                : null,
            PurchaseRate = dto.PurchaseRate ?? 0m,
            Badge = string.IsNullOrWhiteSpace(dto.Badge) ? null : dto.Badge.Trim()
        };
        dbContext.Products.Add(product);

        // Main image
        if (!string.IsNullOrWhiteSpace(dto.Image))
        {
            dbContext.ProductImages.Add(new Ecommerce.Domain.Entities.ProductImage
            {
                ProductId = product.Id,
                ImageUrl = dto.Image,
                IsMain = true,
                DisplayOrder = 1
            });
        }
        if (dto.Images != null)
        {
            var order = 2;
            foreach (var imgUrl in dto.Images.Where(u => !string.IsNullOrWhiteSpace(u)))
            {
                dbContext.ProductImages.Add(new Ecommerce.Domain.Entities.ProductImage
                {
                    ProductId = product.Id,
                    ImageUrl = imgUrl,
                    IsMain = false,
                    DisplayOrder = order++
                });
            }
        }

        // Size variants with stock & price overrides
        var sizes = dto.Sizes != null && dto.Sizes.Count > 0
            ? dto.Sizes.Select(s => s.Trim()).Where(s => !string.IsNullOrWhiteSpace(s)).ToList()
            : new List<string> { "M", "L", "XL" };

        foreach (var sizeName in sizes)
        {
            var priceOverride = dto.SizePrices != null && dto.SizePrices.TryGetValue(sizeName, out var pOverride) && pOverride > 0
                ? pOverride
                : dto.Price;
            var stockQty = dto.SizeStock != null && dto.SizeStock.TryGetValue(sizeName, out var sQty)
                ? Math.Max(0, sQty)
                : 15;

            dbContext.ProductVariants.Add(new Ecommerce.Domain.Entities.ProductVariant
            {
                ProductId = product.Id,
                Name = $"Size: {sizeName}",
                SKU = $"SKU-{slug}-{sizeName}".Replace("-", "").ToUpper(),
                PriceOverride = priceOverride,
                StockQuantity = stockQty,
                IsActive = true
            });
        }

        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { Message = $"Failed to save product. {ex.InnerException?.Message ?? ex.Message}" });
        }

        return Ok(new { success = true, slug });
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> DeleteProduct(string slug, [FromServices] Ecommerce.Application.Common.Interfaces.IApplicationDbContext dbContext)
    {
        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (product == null)
        {
            return NotFound(new { Message = $"Product with slug '{slug}' not found." });
        }

        var hasOrders = await dbContext.OrderItems.AnyAsync(i => i.ProductId == product.Id);
        if (hasOrders)
        {
            product.IsActive = false;
            product.UpdatedAtUtc = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            return Ok(new { success = true, message = "Product has order history; deactivated instead of deleted." });
        }

        var variants = await dbContext.ProductVariants.Where(v => v.ProductId == product.Id).ToListAsync();
        var images = await dbContext.ProductImages.Where(i => i.ProductId == product.Id).ToListAsync();
        dbContext.ProductVariants.RemoveRange(variants);
        dbContext.ProductImages.RemoveRange(images);
        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync();

        return Ok(new { success = true });
    }
}
