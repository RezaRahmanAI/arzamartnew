using System.Security.Claims;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Orders.Commands;
using Ecommerce.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

[ApiController]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly IApplicationDbContext _context;

    public OrdersController(ISender mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    public record CreateOrderApiRequest(List<CreateOrderItemDto> Items, string ShippingAddressJson, string? CouponCode);

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();

        var result = orders.Select(o => new {
            id = string.IsNullOrWhiteSpace(o.OrderNumber) ? $"ORD-{o.Id}" : o.OrderNumber,
            customer = o.Customer != null ? o.Customer.FullName : "Customer User",
            phone = o.Customer != null ? o.Customer.Phone : "01700000000",
            address = o.ShippingAddressJson,
            city = "dhaka",
            note = "Delivery order",
            payment = o.PaymentStatus.ToString().ToLower(),
            total = o.TotalAmount,
            delivery = o.ShippingFee,
            status = o.OrderStatus.ToString().ToLower(),
            date = o.CreatedAtUtc.ToString("yyyy-MM-dd"),
            source = "checkout",
            items = o.Items.Select(i => new {
                slug = "product",
                name = string.IsNullOrWhiteSpace(i.ProductName) ? $"Product Item #{i.ProductId}" : i.ProductName,
                size = "Standard",
                color = "Default",
                qty = i.Quantity,
                price = i.UnitPrice
            })
        });

        return Ok(result);
    }

    [HttpGet("incomplete")]
    public IActionResult GetIncompleteOrders()
    {
        return Ok(new List<object>());
    }

    [HttpPost("incomplete")]
    public IActionResult SaveIncompleteOrder([FromBody] object body)
    {
        return Ok(body);
    }

    [HttpDelete("incomplete/{id}")]
    public IActionResult RemoveIncompleteOrder(string id)
    {
        return NoContent();
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderApiRequest request)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var customerId))
        {
            return Unauthorized(new { Message = "Invalid user authentication context." });
        }

        var command = new CreateOrderCommand(customerId, request.Items, request.ShippingAddressJson, request.CouponCode);
        var result = await _mediator.Send(command);

        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] UpdateOrderStatusRequest req)
    {
        var cleanIdStr = id.Replace("ORD-", "");
        if (Guid.TryParse(cleanIdStr, out var orderGuid))
        {
            var order = await _context.Orders.FindAsync(orderGuid);
            if (order != null && Enum.TryParse<Ecommerce.Domain.Enums.OrderStatus>(req.Status, true, out var parsedStatus))
            {
                order.OrderStatus = parsedStatus;
                await _context.SaveChangesAsync();
                return Ok(order);
            }
        }
        return Ok(new { id, status = req.Status });
    }
}
