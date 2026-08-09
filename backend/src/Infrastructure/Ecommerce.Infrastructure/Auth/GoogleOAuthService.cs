using Ecommerce.Application.Common.Interfaces;

namespace Ecommerce.Infrastructure.Auth;

public class GoogleOAuthService : IGoogleOAuthService
{
    public Task<GoogleUserInfo?> ValidateGoogleTokenAsync(string idToken, CancellationToken ct = default)
    {
        // Mock / Standard Google OAuth validation logic
        if (string.IsNullOrWhiteSpace(idToken)) return Task.FromResult<GoogleUserInfo?>(null);

        var userInfo = new GoogleUserInfo(
            GoogleId: $"g_{idToken.GetHashCode():X}",
            Email: "user@gmail.com",
            FirstName: "Google",
            LastName: "User",
            PictureUrl: "https://lh3.googleusercontent.com/a/default-user"
        );

        return Task.FromResult<GoogleUserInfo?>(userInfo);
    }
}
