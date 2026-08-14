using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Products.Queries;

public record GetProductBySlugQuery(string Slug) : IRequest<Result<ProductDetailDto>>;

public record ProductDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string SKU,
    string ShortDescription,
    string FullDescription,
    decimal BasePrice,
    decimal? DiscountPrice,
    decimal AverageRating,
    int ReviewCount,
    string CategoryName,
    string BrandName,
    bool IsBundle,
    List<string>? BundleProducts,
    List<ProductImageDto> Images,
    List<ProductVariantDto> Variants
);

public record ProductImageDto(string ImageUrl, bool IsMain);
public record ProductVariantDto(Guid Id, string Name, string SKU, decimal? PriceOverride, int StockQuantity);

public class GetProductBySlugQueryHandler : IRequestHandler<GetProductBySlugQuery, Result<ProductDetailDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public GetProductBySlugQueryHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<Result<ProductDetailDto>> Handle(GetProductBySlugQuery request, CancellationToken cancellationToken)
    {
        var product = await _unitOfWork.Repository<Product>()
            .Query()
            .AsNoTracking()
            .Where(p => p.Slug == request.Slug && p.IsActive)
            .Select(p => new ProductDetailDto(
                p.Id,
                p.Name,
                p.Slug,
                p.SKU,
                p.ShortDescription,
                p.FullDescription,
                p.BasePrice,
                p.DiscountPrice,
                p.AverageRating,
                p.ReviewCount,
                p.Category != null ? p.Category.Name : "General",
                p.Brand != null ? p.Brand.Name : "Arzamart",
                p.IsBundle,
                p.BundleProducts != null && p.BundleProducts.Length > 0 ? p.BundleProducts.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList() : null,
                p.Images.OrderBy(i => i.DisplayOrder).Select(i => new ProductImageDto(i.ImageUrl, i.IsMain)).ToList(),
                p.Variants.Where(v => v.IsActive).Select(v => new ProductVariantDto(v.Id, v.Name, v.SKU, v.PriceOverride, v.StockQuantity)).ToList()
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (product == null) return Result<ProductDetailDto>.Failure("Product not found.");

        return Result<ProductDetailDto>.Success(product);
    }
}
