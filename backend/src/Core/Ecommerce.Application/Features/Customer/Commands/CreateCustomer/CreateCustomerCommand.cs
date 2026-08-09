using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using FluentValidation;
using MediatR;

namespace Ecommerce.Application.Features.Customer.Commands.CreateCustomer;

public record CreateCustomerCommand(
    string FullName,
    string Email,
    string Phone,
    string? DefaultAddress,
    string District = "Dhaka",
    bool IsGuest = false
) : IRequest<Result<CustomerDto>>;

public record CustomerDto(Guid Id, string FullName, string Email, string Phone, string District, bool IsGuest);

public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty().MinimumLength(11);
    }
}

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Result<CustomerDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateCustomerCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CustomerDto>> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<Domain.Entities.Customer>();
        var existing = await repo.FindAsync(c => c.Phone == request.Phone, cancellationToken);
        var customer = existing.FirstOrDefault();

        if (customer == null)
        {
            customer = new Domain.Entities.Customer
            {
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                DefaultAddress = request.DefaultAddress,
                District = request.District,
                IsGuest = request.IsGuest
            };

            await repo.AddAsync(customer, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result<CustomerDto>.Success(new CustomerDto(
            customer.Id,
            customer.FullName,
            customer.Email,
            customer.Phone,
            customer.District,
            customer.IsGuest
        ));
    }
}
