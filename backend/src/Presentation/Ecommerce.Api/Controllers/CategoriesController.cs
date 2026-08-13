using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Caching.Memory;

namespace Ecommerce.Api.Controllers;

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string? ImageUrl { get; set; }
    public string? Blurb { get; set; }
    public bool? IsActive { get; set; }
}

[ApiController]
[Route("api/v1/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private const string CATEGORIES_CACHE_KEY = "categories_list_cache_v1";

    public CategoriesController(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        if (!_cache.TryGetValue(CATEGORIES_CACHE_KEY, out List<Category>? categories) || categories == null)
        {
            categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));

            _cache.Set(CATEGORIES_CACHE_KEY, categories, cacheOptions);
        }
        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCategoryById(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();
        return Ok(category);
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetCategoryBySlug(string slug)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound();
        return Ok(category);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest("Category name is required.");
        }

        var slug = string.IsNullOrWhiteSpace(req.Slug)
            ? req.Name.ToLower().Replace(" ", "-")
            : req.Slug;

        var existing = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (existing != null)
        {
            return BadRequest("Category with this slug already exists.");
        }

        var maxOrder = await _context.Categories.MaxAsync(c => (int?)c.DisplayOrder) ?? 0;

        var category = new Category
        {
            Name = req.Name,
            Slug = slug,
            ImageUrl = req.Image ?? req.ImageUrl ?? "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
            Blurb = req.Blurb,
            DisplayOrder = maxOrder + 1
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        _cache.Remove(CATEGORIES_CACHE_KEY);

        return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, category);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCategoryById(int id, [FromBody] CreateCategoryRequest req)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name)) category.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Slug)) category.Slug = req.Slug;
        if (!string.IsNullOrWhiteSpace(req.Image ?? req.ImageUrl)) category.ImageUrl = req.Image ?? req.ImageUrl;
        if (req.Blurb != null) category.Blurb = req.Blurb;
        if (req.IsActive.HasValue) category.IsActive = req.IsActive.Value;

        await _context.SaveChangesAsync();
        _cache.Remove(CATEGORIES_CACHE_KEY);
        return Ok(category);
    }

    [HttpPut("by-slug/{slug}")]
    [HttpPatch("by-slug/{slug}")]
    [HttpPut("{slug}")]
    [HttpPatch("{slug}")]
    public async Task<IActionResult> UpdateCategoryBySlug(string slug, [FromBody] CreateCategoryRequest req)
    {
        var cleanSlug = slug.Trim().ToLower();
        var category = await _context.Categories.FirstOrDefaultAsync(c =>
            c.Slug == cleanSlug ||
            c.Slug == cleanSlug.Replace("-", "") ||
            c.Slug.Replace("-", "") == cleanSlug.Replace("-", "") ||
            c.Name.ToLower() == cleanSlug.Replace("-", " ")
        );

        if (category == null && int.TryParse(slug, out int catId))
        {
            category = await _context.Categories.FindAsync(catId);
        }

        if (category == null)
        {
            return NotFound(new { Message = $"Category '{slug}' not found." });
        }

        if (req != null)
        {
            if (!string.IsNullOrWhiteSpace(req.Name)) category.Name = req.Name.Trim();
            if (!string.IsNullOrWhiteSpace(req.Slug)) category.Slug = req.Slug.Trim();

            var newImg = req.Image ?? req.ImageUrl;
            if (!string.IsNullOrWhiteSpace(newImg))
            {
                category.ImageUrl = newImg.Trim();
            }
            if (req.Blurb != null) category.Blurb = req.Blurb;
            if (req.IsActive.HasValue) category.IsActive = req.IsActive.Value;

            await _context.SaveChangesAsync();
            _cache.Remove(CATEGORIES_CACHE_KEY);
        }

        return Ok(category);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCategoryById(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        _cache.Remove(CATEGORIES_CACHE_KEY);
        return NoContent();
    }

    [HttpDelete("by-slug/{slug}")]
    public async Task<IActionResult> DeleteCategoryBySlug(string slug)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound();

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        _cache.Remove(CATEGORIES_CACHE_KEY);
        return NoContent();
    }
}
