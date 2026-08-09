using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Categories.Queries;

public record GetCategoriesQuery : IRequest<Result<List<CategoryDto>>>;

public record CategoryDto(
    int Id,
    string Name,
    string Slug,
    string? ImageUrl,
    List<CategoryDto> SubCategories
);

public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, Result<List<CategoryDto>>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public GetCategoriesQueryHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<Result<List<CategoryDto>>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        const string cacheKey = "categories_tree";
        var cached = await _cacheService.GetAsync<List<CategoryDto>>(cacheKey, cancellationToken);
        if (cached != null) return Result<List<CategoryDto>>.Success(cached);

        var categories = await _unitOfWork.Repository<Category>()
            .Query()
            .AsNoTracking()
            .Where(c => c.IsActive && c.ParentCategoryId == null)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new CategoryDto(
                c.Id,
                c.Name,
                c.Slug,
                c.ImageUrl,
                c.SubCategories.Where(sc => sc.IsActive).OrderBy(sc => sc.DisplayOrder).Select(sc => new CategoryDto(
                    sc.Id,
                    sc.Name,
                    sc.Slug,
                    sc.ImageUrl,
                    new List<CategoryDto>()
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        await _cacheService.SetAsync(cacheKey, categories, TimeSpan.FromHours(1), ct: cancellationToken);
        return Result<List<CategoryDto>>.Success(categories);
    }
}
