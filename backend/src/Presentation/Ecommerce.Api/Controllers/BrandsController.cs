using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class BrandsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public BrandsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetBrands()
    {
        var brands = await _context.Brands
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name, b.Slug, b.LogoUrl, b.IsActive })
            .ToListAsync();
        return Ok(brands);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBrandById(int id)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand == null) return NotFound();
        return Ok(new { brand.Id, brand.Name, brand.Slug, brand.LogoUrl, brand.IsActive });
    }

    [HttpPost]
    public async Task<IActionResult> CreateBrand([FromBody] CreateBrandRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Brand name is required.");

        var slug = string.IsNullOrWhiteSpace(req.Slug)
            ? req.Name.Trim().ToLower().Replace(" ", "-")
            : req.Slug.Trim().ToLower();

        if (await _context.Brands.AnyAsync(b => b.Slug == slug))
            return BadRequest("A brand with this slug already exists.");

        var brand = new Brand
        {
            Name = req.Name.Trim(),
            Slug = slug,
            LogoUrl = req.LogoUrl,
            IsActive = req.IsActive ?? true
        };

        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();

        return Ok(new { brand.Id, brand.Name, brand.Slug, brand.LogoUrl, brand.IsActive });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBrand(int id, [FromBody] CreateBrandRequest req)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name)) brand.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Slug)) brand.Slug = req.Slug.Trim().ToLower();
        if (req.LogoUrl != null) brand.LogoUrl = req.LogoUrl;
        if (req.IsActive.HasValue) brand.IsActive = req.IsActive.Value;
        brand.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { brand.Id, brand.Name, brand.Slug, brand.LogoUrl, brand.IsActive });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBrand(int id)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand == null) return NotFound();

        var hasProducts = await _context.Products.AnyAsync(p => p.BrandId == id);
        if (hasProducts)
            return BadRequest("Cannot delete brand that has products assigned.");

        _context.Brands.Remove(brand);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateBrandRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? LogoUrl { get; set; }
    public bool? IsActive { get; set; }
}
