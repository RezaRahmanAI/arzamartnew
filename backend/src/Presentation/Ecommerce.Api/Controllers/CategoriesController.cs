using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string? ImageUrl { get; set; }
    public string? Blurb { get; set; }
}

[ApiController]
[Route("api/v1/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public CategoriesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();
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
            DisplayOrder = maxOrder + 1
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

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

        await _context.SaveChangesAsync();
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

            await _context.SaveChangesAsync();
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
        return NoContent();
    }

    [HttpDelete("by-slug/{slug}")]
    public async Task<IActionResult> DeleteCategoryBySlug(string slug)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound();

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
