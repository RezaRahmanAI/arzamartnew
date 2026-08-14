using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Products.Queries;

public record GetProductsPagedQuery(
    int PageIndex = 1,
    int PageSize = 12,
    string? Search = null,
    int? CategoryId = null
) : IRequest<Result<PagedResult<ProductDto>>>;

public record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string SKU,
    decimal BasePrice,
    decimal? DiscountPrice,
    string? MainImageUrl,
    string? ShortDescription,
    string? FullDescription,
    string? Badge,
    decimal PurchaseRate,
    string CategoryName,
    string BrandName,
    decimal AverageRating,
    int ReviewCount,
    bool IsBundle,
    List<string>? BundleProducts,
    List<ProductVariantDto>? Variants,
    List<string>? Images
);

public class GetProductsPagedQueryHandler : IRequestHandler<GetProductsPagedQuery, Result<PagedResult<ProductDto>>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public GetProductsPagedQueryHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<Result<PagedResult<ProductDto>>> Handle(GetProductsPagedQuery request, CancellationToken cancellationToken)
    {
        var query = _unitOfWork.Repository<Product>().Query().AsNoTracking().Where(p => p.IsActive);

        if (request.CategoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            query = query.Where(p => p.Name.Contains(request.Search) || p.ShortDescription.Contains(request.Search));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((request.PageIndex - 1) * request.PageSize)
            .Take(request.PageSize)
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
                p.Brand != null ? p.Brand.Name : "Arzamart",
                p.AverageRating,
                p.ReviewCount,
                p.IsBundle,
                p.BundleProducts != null && p.BundleProducts.Length > 0 ? p.BundleProducts.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList() : null,
                p.Variants.Where(v => v.IsActive).Select(v => new ProductVariantDto(v.Id, v.Name, v.SKU, v.PriceOverride, v.StockQuantity)).ToList(),
                p.Images.Where(i => !i.IsMain).OrderBy(i => i.DisplayOrder).Select(i => i.ImageUrl).ToList()
            ))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<ProductDto>(items, totalCount, request.PageIndex, request.PageSize);
        return Result<PagedResult<ProductDto>>.Success(result);
    }
}
