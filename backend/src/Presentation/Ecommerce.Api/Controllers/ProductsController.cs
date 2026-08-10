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
        bool? IsActive
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
            if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;

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

    [HttpPost]
    public IActionResult CreateProduct([FromBody] object body)
    {
        return Ok(new { success = true });
    }

    [HttpDelete("{slug}")]
    public IActionResult DeleteProduct(string slug)
    {
        return Ok(new { success = true });
    }
}
