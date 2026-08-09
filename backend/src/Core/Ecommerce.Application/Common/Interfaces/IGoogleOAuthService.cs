namespace Ecommerce.Application.Common.Interfaces;

public interface IGoogleOAuthService
{
    Task<GoogleUserInfo?> ValidateGoogleTokenAsync(string idToken, CancellationToken ct = default);
}

public record GoogleUserInfo(string GoogleId, string Email, string FirstName, string LastName, string PictureUrl);
