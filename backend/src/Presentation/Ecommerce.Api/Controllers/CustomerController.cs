using Ecommerce.Application.Common.Helpers;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Customer.Commands.CreateCustomer;
using Ecommerce.Application.Features.Customer.Commands.LinkGoogleAccount;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly IApplicationDbContext _context;

    public CustomerController(ISender mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers()
    {
        var customers = await _context.Customers
            .AsNoTracking()
            .Select(c => new
            {
                c.Id,
                c.FullName,
                c.Phone,
                c.Email,
                c.District,
                c.DefaultAddress,
                c.IsGuest,
                c.CreatedAtUtc,
                OrderCount = c.Orders.Count(),
                TotalSpent = c.Orders
                    .Where(o => o.OrderStatus != OrderStatus.Cancelled && o.OrderStatus != OrderStatus.Refund)
                    .Sum(o => (decimal?)o.TotalAmount) ?? 0
            })
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync();

        return Ok(customers);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpPost("link-google")]
    public async Task<IActionResult> LinkGoogleAccount([FromBody] LinkGoogleAccountCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpGet("by-phone/{phone}")]
    public async Task<IActionResult> GetByPhone(string phone)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Phone == phone.Trim());
        if (customer == null) return NotFound(new { Message = "No account found with this number." });
        return Ok(ToProfileDto(customer));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] CustomerLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { Message = "Identifier and password are required." });
        }

        var query = request.Identifier.Trim();
        var isEmail = query.Contains("@");
        var customer = isEmail
            ? await _context.Customers.FirstOrDefaultAsync(c =>
                c.Email.ToLower() == query.ToLower() || c.GoogleEmail != null && c.GoogleEmail.ToLower() == query.ToLower())
            : await _context.Customers.FirstOrDefaultAsync(c => c.Phone == query);

        if (customer == null)
        {
            return NotFound(new { Message = "No account found. Place an order with this number first, then set a password." });
        }

        if (string.IsNullOrEmpty(customer.PasswordHash))
        {
            return Unauthorized(new { Message = "No password set for this account. Sign in with Google or set a password from your profile." });
        }

        if (!PasswordHasher.VerifyPassword(request.Password, customer.PasswordHash))
        {
            return Unauthorized(new { Message = "Incorrect password. Please try again." });
        }

        customer.LastLoginAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToProfileDto(customer));
    }

    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetCustomerPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { Message = "Phone and new password are required." });
        }
        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { Message = "Password must be at least 6 characters." });
        }

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == request.Phone.Trim());
        if (customer == null)
        {
            return NotFound(new { Message = "No account found with this number." });
        }

        if (!string.IsNullOrEmpty(customer.PasswordHash))
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                !PasswordHasher.VerifyPassword(request.CurrentPassword, customer.PasswordHash))
            {
                return Unauthorized(new { Message = "Current password is incorrect." });
            }
        }

        customer.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        customer.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToProfileDto(customer));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateCustomerProfileRequest request)
    {
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return NotFound(new { Message = "Customer not found." });

        customer.FullName = string.IsNullOrWhiteSpace(request.FullName) ? customer.FullName : request.FullName.Trim();
        customer.Phone = string.IsNullOrWhiteSpace(request.Phone) ? customer.Phone : request.Phone.Trim();
        customer.Email = request.Email ?? customer.Email;
        customer.DefaultAddress = request.DefaultAddress;
        customer.Area = request.Area;
        customer.District = string.IsNullOrWhiteSpace(request.District) ? customer.District : request.District;
        customer.PostalCode = request.PostalCode;
        customer.DefaultNote = request.DefaultNote;
        customer.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToProfileDto(customer));
    }

    private static object ToProfileDto(Customer c)
    {
        return new
        {
            id = c.Id,
            fullName = c.FullName,
            email = c.Email,
            phone = c.Phone,
            googleId = c.GoogleId,
            googleEmail = c.GoogleEmail,
            profileImage = c.ProfileImage,
            defaultAddress = c.DefaultAddress,
            area = c.Area,
            district = c.District,
            postalCode = c.PostalCode,
            defaultNote = c.DefaultNote,
            isGuest = c.IsGuest,
            hasPassword = !string.IsNullOrEmpty(c.PasswordHash),
            lastLoginAtUtc = c.LastLoginAtUtc,
            createdAtUtc = c.CreatedAtUtc
        };
    }

    public record CustomerLoginRequest(string Identifier, string Password);
    public record SetCustomerPasswordRequest(string Phone, string? CurrentPassword, string NewPassword);
    public record UpdateCustomerProfileRequest(
        string? FullName,
        string? Phone,
        string? Email,
        string? DefaultAddress,
        string? Area,
        string? District,
        string? PostalCode,
        string? DefaultNote);
}
