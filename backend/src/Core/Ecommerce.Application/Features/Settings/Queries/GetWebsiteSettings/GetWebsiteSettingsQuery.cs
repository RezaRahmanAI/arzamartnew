using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Settings.Queries.GetWebsiteSettings;

public record GetWebsiteSettingsQuery : IRequest<Result<WebsiteSettingsDto>>;

public record WebsiteSettingsDto(
    string SiteName,
    string LogoUrl,
    string SupportEmail,
    string SupportPhone,
    string MetaTitle,
    string MetaDescription,
    string FacebookUrl,
    string InstagramUrl,
    string DeliveryInsideDhaka,
    string DeliveryOutsideDhaka
);

public class GetWebsiteSettingsQueryHandler : IRequestHandler<GetWebsiteSettingsQuery, Result<WebsiteSettingsDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public GetWebsiteSettingsQueryHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<Result<WebsiteSettingsDto>> Handle(GetWebsiteSettingsQuery request, CancellationToken cancellationToken)
    {
        const string cacheKey = "website_settings";
        var cached = await _cacheService.GetAsync<WebsiteSettingsDto>(cacheKey, cancellationToken);
        if (cached != null) return Result<WebsiteSettingsDto>.Success(cached);

        var settingsRepo = _unitOfWork.Repository<WebsiteSettings>();
        var settings = (await settingsRepo.GetAllAsync(cancellationToken)).FirstOrDefault();

        if (settings == null)
        {
            settings = new WebsiteSettings();
            await settingsRepo.AddAsync(settings, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var dto = new WebsiteSettingsDto(
            settings.SiteName,
            settings.LogoUrl,
            settings.SupportEmail,
            settings.SupportPhone,
            settings.MetaTitle,
            settings.MetaDescription,
            settings.FacebookUrl,
            settings.InstagramUrl,
            settings.DeliveryInsideDhaka,
            settings.DeliveryOutsideDhaka
        );

        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromDays(1), ct: cancellationToken);
        return Result<WebsiteSettingsDto>.Success(dto);
    }
}
