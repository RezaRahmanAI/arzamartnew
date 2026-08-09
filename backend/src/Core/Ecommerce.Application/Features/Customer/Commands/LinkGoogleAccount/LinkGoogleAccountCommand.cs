using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Customer.Commands.LinkGoogleAccount;

public record LinkGoogleAccountCommand(
    Guid CustomerId,
    string GoogleId,
    string GoogleEmail
) : IRequest<Result<bool>>;

public class LinkGoogleAccountCommandHandler : IRequestHandler<LinkGoogleAccountCommand, Result<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public LinkGoogleAccountCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(LinkGoogleAccountCommand request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<Domain.Entities.Customer>();
        var customer = await repo.GetByIdAsync(request.CustomerId, cancellationToken);
        if (customer == null)
        {
            return Result<bool>.Failure("Customer profile not found.");
        }

        customer.GoogleId = request.GoogleId;
        if (string.IsNullOrWhiteSpace(customer.Email)) customer.Email = request.GoogleEmail;
        customer.IsGuest = false;

        repo.Update(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
