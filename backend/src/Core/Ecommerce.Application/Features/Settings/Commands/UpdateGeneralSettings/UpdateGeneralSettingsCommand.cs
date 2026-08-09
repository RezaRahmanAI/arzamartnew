using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;

namespace Ecommerce.Application.Features.Settings.Commands.UpdateGeneralSettings;

public record UpdateGeneralSettingsCommand(
    string SiteName,
    string SupportEmail,
    string SupportPhone,
    string MetaTitle,
    string MetaDescription,
    string DeliveryInsideDhaka,
    string DeliveryOutsideDhaka
) : IRequest<Result<bool>>;

public class UpdateGeneralSettingsCommandHandler : IRequestHandler<UpdateGeneralSettingsCommand, Result<bool>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public UpdateGeneralSettingsCommandHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<Result<bool>> Handle(UpdateGeneralSettingsCommand request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<WebsiteSettings>();
        var settings = (await repo.GetAllAsync(cancellationToken)).FirstOrDefault();

        if (settings == null)
        {
            settings = new WebsiteSettings();
            await repo.AddAsync(settings, cancellationToken);
        }

        settings.SiteName = request.SiteName;
        settings.SupportEmail = request.SupportEmail;
        settings.SupportPhone = request.SupportPhone;
        settings.MetaTitle = request.MetaTitle;
        settings.MetaDescription = request.MetaDescription;
        settings.DeliveryInsideDhaka = request.DeliveryInsideDhaka;
        settings.DeliveryOutsideDhaka = request.DeliveryOutsideDhaka;

        repo.Update(settings);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _cacheService.RemoveAsync("website_settings", cancellationToken);

        return Result<bool>.Success(true);
    }
}
