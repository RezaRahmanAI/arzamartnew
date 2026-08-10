using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class BannersController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private const string BANNERS_CACHE_KEY = "banners_list_cache_v1";

    public BannersController(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetBanners()
    {
        if (!_cache.TryGetValue(BANNERS_CACHE_KEY, out List<Banner>? banners) || banners == null)
        {
            banners = await _context.Banners
                .AsNoTracking()
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));

            _cache.Set(BANNERS_CACHE_KEY, banners, cacheOptions);
        }
        return Ok(banners);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBanner(int id)
    {
        var banner = await _context.Banners.FindAsync(id);
        if (banner == null) return NotFound();
        return Ok(banner);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBanner([FromBody] Banner banner)
    {
        _context.Banners.Add(banner);
        await _context.SaveChangesAsync();
        _cache.Remove(BANNERS_CACHE_KEY);
        return CreatedAtAction(nameof(GetBanner), new { id = banner.Id }, banner);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBanner(int id, [FromBody] Banner updated)
    {
        var existing = await _context.Banners.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Title = updated.Title;
        existing.Subtitle = updated.Subtitle;
        existing.ImageUrl = updated.ImageUrl;
        existing.TargetUrl = updated.TargetUrl;
        existing.DisplayOrder = updated.DisplayOrder;
        existing.IsActive = updated.IsActive;
        existing.Position = updated.Position ?? "slider";

        await _context.SaveChangesAsync();
        _cache.Remove(BANNERS_CACHE_KEY);
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBanner(int id)
    {
        var existing = await _context.Banners.FindAsync(id);
        if (existing == null) return NotFound();

        _context.Banners.Remove(existing);
        await _context.SaveChangesAsync();
        _cache.Remove(BANNERS_CACHE_KEY);
        return NoContent();
    }
}
