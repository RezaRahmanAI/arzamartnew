using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Customer.Commands.CreateCustomer;
using Ecommerce.Application.Features.Customer.Commands.LinkGoogleAccount;
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
}
