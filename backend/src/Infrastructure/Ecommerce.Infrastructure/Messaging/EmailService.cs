using Ecommerce.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Messaging;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken ct = default)
    {
        _logger.LogInformation("Sending email to {ToEmail} with subject '{Subject}'", toEmail, subject);
        return Task.CompletedTask;
    }
}

public class SmsService : ISmsService
{
    private readonly ILogger<SmsService> _logger;

    public SmsService(ILogger<SmsService> logger)
    {
        _logger = logger;
    }

    public Task SendSmsAsync(string phoneNumber, string message, CancellationToken ct = default)
    {
        _logger.LogInformation("Sending SMS to {PhoneNumber}: {Message}", phoneNumber, message);
        return Task.CompletedTask;
    }
}
