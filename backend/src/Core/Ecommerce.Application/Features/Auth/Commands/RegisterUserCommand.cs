using Ecommerce.Application.Common.Helpers;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using FluentValidation;
using MediatR;

namespace Ecommerce.Application.Features.Auth.Commands;

public record RegisterUserCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber
) : IRequest<Result<AuthResultDto>>;

public record AuthResultDto(string Token, string RefreshToken, DateTime ExpiresAtUtc, UserInfoDto User);
public record UserInfoDto(Guid Id, string Email, string FirstName, string LastName, string Role);

public class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.FirstName).NotEmpty();
        RuleFor(x => x.LastName).NotEmpty();
    }
}

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Result<AuthResultDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public RegisterUserCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<AuthResultDto>> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var userRepo = _unitOfWork.Repository<User>();
        var existing = await userRepo.FindAsync(u => u.Email == request.Email, cancellationToken);
        if (existing.Any())
        {
            return Result<AuthResultDto>.Failure("Email is already registered.");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            Role = UserRole.Customer
        };

        await userRepo.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var token = "jwt-placeholder-token";
        var refreshToken = Guid.NewGuid().ToString("N");

        return Result<AuthResultDto>.Success(new AuthResultDto(
            token,
            refreshToken,
            DateTime.UtcNow.AddDays(7),
            new UserInfoDto(user.Id, user.Email, user.FirstName, user.LastName, user.Role.ToString())
        ));
    }
}
