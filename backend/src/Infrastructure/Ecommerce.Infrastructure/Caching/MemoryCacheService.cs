using System.Text.Json;
using Ecommerce.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace Ecommerce.Infrastructure.Caching;

public class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;

    public MemoryCacheService(IMemoryCache memoryCache)
    {
        _memoryCache = memoryCache;
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        if (_memoryCache.TryGetValue(key, out string? json) && !string.IsNullOrEmpty(json))
        {
            var value = JsonSerializer.Deserialize<T>(json);
            return Task.FromResult(value);
        }
        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, TimeSpan? absoluteExpiration = null, CancellationToken ct = default)
    {
        var options = new MemoryCacheEntryOptions
        {
            SlidingExpiration = slidingExpiration ?? TimeSpan.FromMinutes(10),
            AbsoluteExpirationRelativeToNow = absoluteExpiration ?? TimeSpan.FromHours(1),
            Size = 1 // Basic sizing constraint for MemoryCache
        };

        var json = JsonSerializer.Serialize(value);
        _memoryCache.Set(key, json, options);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _memoryCache.Remove(key);
        return Task.CompletedTask;
    }
}
