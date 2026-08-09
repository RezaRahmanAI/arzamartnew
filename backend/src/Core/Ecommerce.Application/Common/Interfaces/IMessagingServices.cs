namespace Ecommerce.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken ct = default);
}

public interface ISmsService
{
    Task SendSmsAsync(string phoneNumber, string message, CancellationToken ct = default);
}
