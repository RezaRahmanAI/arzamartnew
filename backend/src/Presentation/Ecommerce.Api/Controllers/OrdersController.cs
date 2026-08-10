using System.Security.Claims;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Orders.Commands;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class FrontendOrderItemDto
{
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal Price { get; set; }
}

public class FrontendOrderDto
{
    public string? Id { get; set; }
    public string? CustomerId { get; set; }
    public string Customer { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? Payment { get; set; }
    public List<FrontendOrderItemDto> Items { get; set; } = new();
    public decimal Total { get; set; }
    public decimal Delivery { get; set; }
    public string Status { get; set; } = "pending";
    public string? Date { get; set; }
    public string? Source { get; set; }
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
            customerId = o.CustomerId.ToString(),
            customer = o.Customer != null ? o.Customer.FullName : "Customer User",
            phone = o.Customer != null ? o.Customer.Phone : "01700000000",
            address = o.ShippingAddressJson,
            city = o.Customer != null ? o.Customer.District : "dhaka",
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

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] FrontendOrderDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new { Message = "Order payload cannot be null." });
        }

        try
        {
            // Find or create customer by phone number
            var phone = !string.IsNullOrWhiteSpace(dto.Phone) ? dto.Phone.Trim() : "01700000000";
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == phone);
            if (customer == null)
            {
                var customerName = !string.IsNullOrWhiteSpace(dto.Customer) ? dto.Customer.Trim() : "Guest Customer";
                customer = new Customer
                {
                    FullName = customerName,
                    Phone = phone,
                    Email = $"{phone.Replace("+", "").Replace(" ", "")}@guest.arzamart.com",
                    DefaultAddress = dto.Address ?? "",
                    District = string.IsNullOrWhiteSpace(dto.City) ? "Dhaka" : dto.City,
                    IsGuest = true,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }

            var orderNum = string.IsNullOrWhiteSpace(dto.Id) ? $"ORD-{Random.Shared.Next(10000, 99999)}" : dto.Id.Trim();

            var statusStr = dto.Status ?? "pending";
            Enum.TryParse<Ecommerce.Domain.Enums.OrderStatus>(statusStr, true, out var parsedStatus);

            var paymentStr = dto.Payment ?? "pending";
            var paymentStatus = paymentStr.ToLower().Contains("paid") ? PaymentStatus.Paid : PaymentStatus.Pending;

            var shippingAddress = $"{dto.Address}, {dto.City}".Trim(new[] { ' ', ',' });
            if (!string.IsNullOrWhiteSpace(dto.Note))
            {
                shippingAddress += $" (Note: {dto.Note})";
            }

            var order = new Order
            {
                OrderNumber = orderNum,
                CustomerId = customer.Id,
                SubTotal = dto.Total > dto.Delivery ? dto.Total - dto.Delivery : dto.Total,
                DiscountAmount = 0,
                ShippingFee = dto.Delivery,
                TotalAmount = dto.Total,
                OrderStatus = parsedStatus,
                PaymentStatus = paymentStatus,
                ShippingAddressJson = shippingAddress,
                CreatedAtUtc = DateTime.UtcNow,
                Items = new List<OrderItem>()
            };

            if (dto.Items != null && dto.Items.Count > 0)
            {
                foreach (var item in dto.Items)
                {
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Slug == item.Slug || p.Name == item.Name);
                    var itemTitle = $"{item.Name}";
                    if (!string.IsNullOrWhiteSpace(item.Size) && item.Size != "Standard")
                    {
                        itemTitle += $" ({item.Size})";
                    }

                    order.Items.Add(new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = product?.Id ?? Guid.NewGuid(),
                        ProductName = itemTitle,
                        UnitPrice = item.Price,
                        Quantity = item.Qty > 0 ? item.Qty : 1
                    });
                }
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, orderNumber = orderNum, id = orderNum });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Failed to save order to database.", Error = ex.Message });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] UpdateOrderStatusRequest req)
    {
        var cleanIdStr = id.Replace("ORD-", "");
        var isGuid = Guid.TryParse(cleanIdStr, out var g);
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderNumber == id || o.OrderNumber == $"ORD-{id}" || (isGuid && o.Id == g));

        if (order != null && Enum.TryParse<Ecommerce.Domain.Enums.OrderStatus>(req.Status, true, out var parsedStatus))
        {
            order.OrderStatus = parsedStatus;
            await _context.SaveChangesAsync();
            return Ok(order);
        }

        return Ok(new { id, status = req.Status });
    }
}
