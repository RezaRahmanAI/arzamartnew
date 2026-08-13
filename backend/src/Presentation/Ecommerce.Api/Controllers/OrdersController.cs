using System.Security.Claims;
using System.Text.Json;
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

public class UpdateOrderItemRequest
{
    public string Slug { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? ProductName { get; set; }
    public string? Size { get; set; }
    public string SizeValue => string.IsNullOrWhiteSpace(Size) ? "Standard" : Size.Trim();
    public string? Color { get; set; }
    public int Qty { get; set; }
    public int? Quantity { get; set; }
    public int QuantityValue => Qty > 0 ? Qty : (Quantity ?? 1);
    public decimal Price { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal PriceValue => Price > 0 ? Price : (UnitPrice ?? 0);
}

public class UpdateOrderRequest
{
    public string? Status { get; set; }
    public string? Customer { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Area { get; set; }
    public string? Note { get; set; }
    public string? Payment { get; set; }
    public decimal? Total { get; set; }
    public decimal? Delivery { get; set; }
    public List<UpdateOrderItemRequest>? Items { get; set; }
}

public class FrontendOrderItemDto
{
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Size { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Qty { get; set; }
    public int? Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal? UnitPrice { get; set; }
}

public class FrontendOrderDto
{
    public string? Id { get; set; }
    public string? CustomerId { get; set; }
    public string Customer { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Area { get; set; }
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

    private static bool TryParseOrderStatus(string? raw, out OrderStatus status)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            status = OrderStatus.Pending;
            return false;
        }

        return Enum.TryParse<OrderStatus>(raw.Replace("-", ""), true, out status);
    }

    private static string StatusToFrontend(OrderStatus status) =>
        status == OrderStatus.ReturnProcess ? "return-process" : status.ToString().ToLower();

    public record CreateOrderApiRequest(List<CreateOrderItemDto> Items, string ShippingAddressJson, string? CouponCode);

    private static (string sourceChannel, string pageName) ExtractOrderSources(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (string.Empty, string.Empty);

        string sourceChannel = string.Empty;
        string pageName = string.Empty;

        var sourceMatch = System.Text.RegularExpressions.Regex.Match(text, @"Source:\s*([^|)\n]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (sourceMatch.Success) sourceChannel = sourceMatch.Groups[1].Value.Trim();

        var socialMatch = System.Text.RegularExpressions.Regex.Match(text, @"Social:\s*([^|)\n]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (socialMatch.Success) pageName = socialMatch.Groups[1].Value.Trim();

        return (sourceChannel, pageName);
    }

    private static List<object> ExtractOrderNotes(string? text)
    {
        var list = new List<object>();
        if (string.IsNullOrWhiteSpace(text)) return list;

        var matches = System.Text.RegularExpressions.Regex.Matches(text, @"Note:\s*(.+?)\s*\(by\s*(.+?)\s*at\s*(.+?)\)");
        foreach (System.Text.RegularExpressions.Match m in matches)
        {
            list.Add(new
            {
                id = Guid.NewGuid().ToString(),
                text = m.Groups[1].Value.Trim(),
                author = m.Groups[2].Value.Trim(),
                timestamp = m.Groups[3].Value.Trim()
            });
        }

        return list;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _context.Orders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                CustomerName = o.Customer != null ? o.Customer.FullName : null,
                CustomerPhone = o.Customer != null ? o.Customer.Phone : null,
                CustomerDistrict = o.Customer != null ? o.Customer.District : null,
                o.ShippingAddressJson,
                o.PaymentStatus,
                o.TotalAmount,
                o.ShippingFee,
                o.OrderStatus,
                o.CreatedAtUtc,
                o.CustomerId,
                Items = o.Items.Select(i => new { i.ProductName, i.ProductId, i.Quantity, i.UnitPrice })
            })
            .ToListAsync();

        var result = orders.Select(o =>
        {
            var (sourceChannel, pageName) = ExtractOrderSources(o.ShippingAddressJson);
            var isManual = !string.IsNullOrWhiteSpace(sourceChannel) || !string.IsNullOrWhiteSpace(pageName);
            var notes = ExtractOrderNotes(o.ShippingAddressJson);

            var customerNoteMatch = System.Text.RegularExpressions.Regex.Match(o.ShippingAddressJson ?? string.Empty, @"\(Note:\s*([^)\n]+)\)");
            var customerNoteText = customerNoteMatch.Success ? customerNoteMatch.Groups[1].Value.Trim() : string.Empty;
            if (!string.IsNullOrWhiteSpace(customerNoteText))
            {
                notes.Insert(0, new
                {
                    id = Guid.NewGuid().ToString(),
                    text = customerNoteText,
                    author = "Customer",
                    timestamp = o.CreatedAtUtc.ToString("MMM dd, hh:mm tt")
                });
            }

            return new
            {
                id = string.IsNullOrWhiteSpace(o.OrderNumber) ? $"ORD-{o.Id}" : o.OrderNumber,
                customerId = o.CustomerId.ToString(),
                customer = o.CustomerName ?? "Customer User",
                phone = o.CustomerPhone ?? "01700000000",
                address = o.ShippingAddressJson,
                city = o.CustomerDistrict ?? "dhaka",
                note = !string.IsNullOrWhiteSpace(customerNoteText) ? customerNoteText : "Delivery order",
                hasNotes = notes.Count > 0,
                notesList = notes,
                payment = o.PaymentStatus.ToString().ToLower(),
                total = o.TotalAmount,
                delivery = o.ShippingFee,
                status = StatusToFrontend(o.OrderStatus),
                date = o.CreatedAtUtc.ToString("yyyy-MM-dd"),
                source = isManual ? "manual" : "checkout",
                socialMediaSourceName = sourceChannel,
                sourcePageName = pageName,
                items = o.Items.Select(i => new
                {
                    slug = "product",
                    name = string.IsNullOrWhiteSpace(i.ProductName) ? $"Product Item #{i.ProductId}" : i.ProductName,
                    size = "Standard",
                    color = "Default",
                    qty = i.Quantity,
                    price = i.UnitPrice
                })
            };
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

    /// <summary>
    /// Generates the next sequential order number using the configured
    /// orderIdPrefix + nextOrderNumber from the persisted system settings.
    /// Falls back to the highest existing number + 1 for that prefix so IDs
    /// always keep incrementing even if the settings counter is stale.
    /// </summary>
    private async Task<(string number, long storedNext)> ResolveNextOrderNumberAsync(CancellationToken ct, long requested)
    {
        var cfg = await LoadOrderNumberConfigAsync(ct);

        // The admin may pass an explicit sequential id (e.g. from settings);
        // otherwise start from the stored counter.
        var candidate = requested;

        // Always advance past the highest existing number for the prefix so
        // a stale counter or a fresh database can never produce a duplicate.
        var existing = await _context.Orders
            .AsNoTracking()
            .Where(o => o.OrderNumber != null && o.OrderNumber.StartsWith(cfg.prefix))
            .Select(o => o.OrderNumber)
            .ToListAsync(ct);

        long maxExisting = 0;
        foreach (var num in existing)
        {
            var suffix = num[cfg.prefix.Length..];
            if (long.TryParse(suffix, out var n) && n > maxExisting)
            {
                maxExisting = n;
            }
        }

        if (candidate <= maxExisting)
        {
            candidate = maxExisting + 1;
        }

        if (candidate < cfg.storedNext)
        {
            candidate = cfg.storedNext;
        }

        // Guard against duplicate concurrent inserts.
        var number = $"{cfg.prefix}{candidate}";
        while (await _context.Orders.AnyAsync(o => o.OrderNumber == number, ct))
        {
            candidate++;
            number = $"{cfg.prefix}{candidate}";
        }

        return (number, candidate + 1);
    }

    private async Task<(string prefix, long storedNext)> LoadOrderNumberConfigAsync(CancellationToken ct)
    {
        var prefix = "ORD-";
        long storedNext = 10001;

        var settings = await _context.WebsiteSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (settings == null || string.IsNullOrWhiteSpace(settings.SettingsJson))
        {
            return (prefix, storedNext);
        }

        try
        {
            using var doc = JsonDocument.Parse(settings.SettingsJson);
            if (doc.RootElement.TryGetProperty("orders", out var ordersNode) &&
                ordersNode.ValueKind == JsonValueKind.Object)
            {
                if (ordersNode.TryGetProperty("orderIdPrefix", out var p) && p.ValueKind == JsonValueKind.String)
                {
                    prefix = p.GetString() ?? prefix;
                }

                if (ordersNode.TryGetProperty("nextOrderNumber", out var n) && n.ValueKind == JsonValueKind.Number)
                {
                    storedNext = n.GetInt64();
                }
            }
        }
        catch
        {
            // Fall back to defaults on malformed settings JSON.
        }

        return (prefix, storedNext);
    }

    private async Task PersistNextOrderNumberAsync(long next, CancellationToken ct)
    {
        try
        {
            var settings = await _context.WebsiteSettings.FirstOrDefaultAsync(ct);
            if (settings == null || string.IsNullOrWhiteSpace(settings.SettingsJson))
            {
                return;
            }

            using var doc = JsonDocument.Parse(settings.SettingsJson);
            using var stream = new MemoryStream();
            using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false }))
            {
                if (doc.RootElement.TryGetProperty("orders", out var ordersNode) &&
                    ordersNode.ValueKind == JsonValueKind.Object)
                {
                    writer.WriteStartObject();
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        if (prop.Name == "orders")
                        {
                            writer.WriteStartObject("orders");
                            foreach (var o in ordersNode.EnumerateObject())
                            {
                                if (o.Name == "nextOrderNumber")
                                {
                                    writer.WriteNumber("nextOrderNumber", next);
                                }
                                else
                                {
                                    o.Value.WriteTo(writer);
                                }
                            }
                            writer.WriteEndObject();
                        }
                        else
                        {
                            prop.Value.WriteTo(writer);
                        }
                    }
                    writer.WriteEndObject();
                }
            }

            settings.SettingsJson = System.Text.Encoding.UTF8.GetString(stream.ToArray());
            await _context.SaveChangesAsync(ct);
        }
        catch
        {
            // Never fail order creation because the counter persistence failed.
        }
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

            // Resolve the next sequential order number (settings prefix + counter),
            // advancing past any existing numbers so IDs never repeat.
            long requestedNum = 0;
            if (!string.IsNullOrWhiteSpace(dto.Id))
            {
                var dash = dto.Id.LastIndexOf('-');
                long.TryParse(dash >= 0 ? dto.Id[(dash + 1)..] : dto.Id, out requestedNum);
            }

            var (orderNum, nextStored) = await ResolveNextOrderNumberAsync(CancellationToken.None, requestedNum);
            await PersistNextOrderNumberAsync(nextStored, CancellationToken.None);

            var statusStr = dto.Status ?? "pending";
            TryParseOrderStatus(statusStr, out var parsedStatus);

            var paymentStr = dto.Payment ?? "pending";
            var paymentStatus = paymentStr.ToLower().Contains("paid") ? PaymentStatus.Paid : PaymentStatus.Pending;

            var addrList = new List<string>();
            if (!string.IsNullOrWhiteSpace(dto.Address)) addrList.Add(dto.Address.Trim());
            if (!string.IsNullOrWhiteSpace(dto.Area)) addrList.Add(dto.Area.Trim());
            if (!string.IsNullOrWhiteSpace(dto.City)) addrList.Add(dto.City.Trim());
            var shippingAddress = string.Join(", ", addrList);
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
                var defaultProduct = await _context.Products.Include(p => p.Variants).FirstOrDefaultAsync();
                if (defaultProduct == null)
                {
                    // Create a fallback system product if table is completely empty
                    var cat = await _context.Categories.FirstOrDefaultAsync();
                    if (cat == null)
                    {
                        cat = new Category { Name = "General", Slug = "general", CreatedAtUtc = DateTime.UtcNow };
                        _context.Categories.Add(cat);
                        await _context.SaveChangesAsync();
                    }
                    var brand = await _context.Brands.FirstOrDefaultAsync();
                    if (brand == null)
                    {
                        brand = new Brand { Name = "General Brand", Slug = "general-brand", CreatedAtUtc = DateTime.UtcNow };
                        _context.Brands.Add(brand);
                        await _context.SaveChangesAsync();
                    }
                    defaultProduct = new Product
                    {
                        Name = "General Product Item",
                        Slug = "general-product-item",
                        SKU = "SKU-GEN-001",
                        BasePrice = 1000,
                        CategoryId = cat.Id,
                        BrandId = brand.Id,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.Products.Add(defaultProduct);
                    await _context.SaveChangesAsync();
                }

                foreach (var item in dto.Items)
                {
                    var itemName = !string.IsNullOrWhiteSpace(item.Name) ? item.Name : (item.ProductName ?? "Product");
                    var itemSlug = item.Slug;
                    var product = await _context.Products
                        .Include(p => p.Variants)
                        .FirstOrDefaultAsync(p => (!string.IsNullOrWhiteSpace(itemSlug) && p.Slug == itemSlug) || (!string.IsNullOrWhiteSpace(itemName) && p.Name == itemName));
                    
                    var targetProductId = product?.Id ?? defaultProduct.Id;

                    var sizeName = !string.IsNullOrWhiteSpace(item.Size) ? item.Size.Trim() : "Standard";
                    var itemTitle = $"{itemName}";
                    if (sizeName != "Standard")
                    {
                        itemTitle += $" ({sizeName})";
                    }

                    var unitPrice = item.Price > 0 ? item.Price : (item.UnitPrice ?? 0);
                    var quantity = item.Qty > 0 ? item.Qty : (item.Quantity ?? 1);

                    var targetProd = product ?? defaultProduct;
                    var variant = await _context.ProductVariants
                        .FirstOrDefaultAsync(v => v.ProductId == targetProd.Id && (v.Name == sizeName || v.Name == $"Size: {sizeName}"));

                    if (variant != null)
                    {
                        if (parsedStatus == OrderStatus.Confirmed)
                        {
                            variant.StockQuantity = Math.Max(0, variant.StockQuantity - quantity);
                        }
                    }
                    else
                    {
                        _context.ProductVariants.Add(new ProductVariant
                        {
                            ProductId = targetProd.Id,
                            Name = sizeName,
                            SKU = string.IsNullOrWhiteSpace(targetProd.SKU) ? $"SKU-{sizeName}" : $"{targetProd.SKU}-{sizeName}",
                            PriceOverride = unitPrice,
                            StockQuantity = parsedStatus == OrderStatus.Confirmed ? Math.Max(0, 15 - quantity) : 15,
                            IsActive = true
                        });
                    }

                    order.Items.Add(new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = targetProductId,
                        ProductName = itemTitle,
                        UnitPrice = unitPrice,
                        Quantity = quantity
                    });
                }
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, orderNumber = orderNum, id = orderNum });
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException != null ? $"{ex.Message} --> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, new { Message = "Failed to save order to database.", Error = detail });
        }
    }

    [HttpPatch("{id}/status")]
    [HttpPut("{id}/status")]
    [HttpPatch("{id}")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] UpdateOrderRequest req)
    {
        if (req == null)
        {
            return BadRequest(new { Message = "Request body cannot be empty." });
        }

        var cleanIdStr = id.Replace("ORD-", "");
        var isGuid = Guid.TryParse(cleanIdStr, out var g);
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderNumber == id || o.OrderNumber == $"ORD-{id}" || (isGuid && o.Id == g));

        if (order == null)
        {
            return NotFound(new { Message = $"Order '{id}' not found." });
        }

        var oldStatus = order.OrderStatus;

        // Full order update (items + customer + totals) from the editable order page
        if (req.Items != null)
        {
            await ApplyFullOrderUpdateAsync(order, req, oldStatus);
            return Ok(new { id, status = StatusToFrontend(order.OrderStatus), orderNumber = order.OrderNumber });
        }

        // Status-only update (keeps history: confirm deducts stock, leaving confirmed restores it)
        if (string.IsNullOrWhiteSpace(req.Status))
        {
            return BadRequest(new { Message = "Order status cannot be empty." });
        }

        if (!TryParseOrderStatus(req.Status, out var parsedStatus))
        {
            return BadRequest(new { Message = $"Unsupported order status: '{req.Status}'" });
        }

        if (oldStatus != parsedStatus)
        {
            if (parsedStatus == OrderStatus.Confirmed)
            {
                await AdjustStockAsync(order, deduct: true);
            }
            else if (oldStatus == OrderStatus.Confirmed)
            {
                await AdjustStockAsync(order, deduct: false);
            }
        }

        order.OrderStatus = parsedStatus;
        await _context.SaveChangesAsync();
        return Ok(new { id, status = StatusToFrontend(parsedStatus), orderNumber = order.OrderNumber });
    }

    public record AddOrderNoteRequest(string Text, string? Author);

    private static string NormalizeSizeName(string sizeName)
    {
        if (string.IsNullOrWhiteSpace(sizeName)) return "Standard";
        return System.Text.RegularExpressions.Regex.Replace(sizeName.Trim(), @"^Size\s*:\s*", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
    }

    private static int OrderItemQuantity(OrderItem item) => Math.Max(1, item.Quantity);

    private static string OrderItemSizeName(OrderItem item)
    {
        var sizeName = "Standard";
        var match = System.Text.RegularExpressions.Regex.Match(item.ProductName ?? string.Empty, @"\(([^)]+)\)$");
        if (match.Success)
        {
            sizeName = match.Groups[1].Value.Trim();
        }
        return NormalizeSizeName(sizeName);
    }

    private async Task AdjustStockAsync(Order order, bool deduct)
    {
        var variantIds = order.Items.Where(i => i.VariantId.HasValue).Select(i => i.VariantId!.Value).Distinct().ToList();
        var variantsById = variantIds.Count > 0
            ? await _context.ProductVariants.Where(v => variantIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id)
            : new Dictionary<Guid, ProductVariant>();

        foreach (var item in order.Items)
        {
            if (item.ProductId == Guid.Empty) continue;

            var sizeName = OrderItemSizeName(item);
            if (item.VariantId.HasValue && variantsById.TryGetValue(item.VariantId.Value, out var byId))
            {
                sizeName = NormalizeSizeName(byId.Name);
            }

            var quantity = OrderItemQuantity(item);

            var variant = await _context.ProductVariants.FirstOrDefaultAsync(v =>
                v.ProductId == item.ProductId && (v.Name == sizeName || v.Name == $"Size: {sizeName}"));

            if (variant == null) continue;

            variant.StockQuantity = deduct
                ? Math.Max(0, variant.StockQuantity - quantity)
                : variant.StockQuantity + quantity;
        }
    }

    private async Task ApplyFullOrderUpdateAsync(Order order, UpdateOrderRequest req, OrderStatus oldStatus)
    {
        var phone = !string.IsNullOrWhiteSpace(req.Phone) ? req.Phone.Trim() : "01700000000";
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == phone);
        if (customer == null)
        {
            customer = new Customer
            {
                FullName = !string.IsNullOrWhiteSpace(req.Customer) ? req.Customer.Trim() : "Guest Customer",
                Phone = phone,
                Email = $"{phone.Replace("+", "").Replace(" ", "")}@guest.arzamart.com",
                DefaultAddress = req.Address ?? "",
                District = string.IsNullOrWhiteSpace(req.City) ? "Dhaka" : req.City,
                IsGuest = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.Customers.Add(customer);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(req.Customer)) customer.FullName = req.Customer.Trim();
            if (!string.IsNullOrWhiteSpace(req.Address)) customer.DefaultAddress = req.Address;
            if (!string.IsNullOrWhiteSpace(req.City)) customer.District = req.City;
        }

        var oldConfirmed = oldStatus == OrderStatus.Confirmed;
        var newStatus = oldStatus;
        if (!string.IsNullOrWhiteSpace(req.Status) && TryParseOrderStatus(req.Status, out var parsedStatus))
        {
            newStatus = parsedStatus;
        }
        var newConfirmed = newStatus == OrderStatus.Confirmed;

        var paymentStatus = order.PaymentStatus;
        if (!string.IsNullOrWhiteSpace(req.Payment))
        {
            paymentStatus = req.Payment.ToLower().Contains("paid") ? PaymentStatus.Paid : PaymentStatus.Pending;
        }

        // Old item -> variant quantities (for stock delta)
        var oldVariantIds = order.Items.Where(i => i.VariantId.HasValue).Select(i => i.VariantId!.Value).Distinct().ToList();
        var oldVariantsById = oldVariantIds.Count > 0
            ? await _context.ProductVariants.Where(v => oldVariantIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id)
            : new Dictionary<Guid, ProductVariant>();

        var oldQuantities = new Dictionary<(Guid productId, string sizeName), int>();
        foreach (var item in order.Items)
        {
            if (item.ProductId == Guid.Empty) continue;
            var sizeName = OrderItemSizeName(item);
            if (item.VariantId.HasValue && oldVariantsById.TryGetValue(item.VariantId.Value, out var byId))
            {
                sizeName = NormalizeSizeName(byId.Name);
            }
            var key = (item.ProductId, sizeName);
            oldQuantities[key] = oldQuantities.GetValueOrDefault(key) + OrderItemQuantity(item);
        }

        // Rebuild order items
        var newLines = new List<OrderItem>();
        var newQuantities = new Dictionary<(Guid productId, string sizeName), int>();
        var defaultProduct = await _context.Products.Include(p => p.Variants).FirstOrDefaultAsync();

        foreach (var item in req.Items!)
        {
            var itemName = !string.IsNullOrWhiteSpace(item.Name)
                ? item.Name.Trim()
                : (!string.IsNullOrWhiteSpace(item.ProductName) ? item.ProductName.Trim() : "Product");

            var product = await _context.Products
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => (!string.IsNullOrWhiteSpace(item.Slug) && p.Slug == item.Slug) || p.Name == itemName);

            var targetProduct = product ?? defaultProduct;
            if (targetProduct == null) continue;

            var sizeName = NormalizeSizeName(item.SizeValue);
            var itemTitle = itemName;
            if (sizeName != "Standard")
            {
                itemTitle += $" ({sizeName})";
            }

            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.ProductId == targetProduct.Id && (v.Name == sizeName || v.Name == $"Size: {sizeName}"));

            if (variant == null)
            {
                variant = new ProductVariant
                {
                    ProductId = targetProduct.Id,
                    Name = sizeName,
                    SKU = string.IsNullOrWhiteSpace(targetProduct.SKU) ? $"SKU-{sizeName}" : $"{targetProduct.SKU}-{sizeName}",
                    PriceOverride = item.PriceValue,
                    StockQuantity = 15,
                    IsActive = true
                };
                _context.ProductVariants.Add(variant);
            }

            var quantity = item.QuantityValue;
            var key = (targetProduct.Id, sizeName);
            newQuantities[key] = newQuantities.GetValueOrDefault(key) + quantity;

            newLines.Add(new OrderItem
            {
                OrderId = order.Id,
                ProductId = targetProduct.Id,
                VariantId = variant.Id,
                ProductName = itemTitle,
                UnitPrice = item.PriceValue,
                Quantity = quantity
            });
        }

        // Stock delta per variant (with/without confirmation transitions)
        if (oldConfirmed || newConfirmed)
        {
            var allKeys = oldQuantities.Keys.Union(newQuantities.Keys).ToList();
            foreach (var key in allKeys)
            {
                var oldQty = oldQuantities.GetValueOrDefault(key);
                var newQty = newQuantities.GetValueOrDefault(key);

                int delta;
                if (oldConfirmed && newConfirmed)
                {
                    delta = newQty - (oldQuantities.ContainsKey(key) ? oldQty : 0);
                }
                else if (newConfirmed)
                {
                    delta = -newQty;
                }
                else
                {
                    delta = oldQty;
                }
                if (delta == 0) continue;

                var variant = await _context.ProductVariants
                    .FirstOrDefaultAsync(v => v.ProductId == key.productId && (v.Name == key.sizeName || v.Name == $"Size: {key.sizeName}"));

                if (variant == null) continue;
                variant.StockQuantity = Math.Max(0, variant.StockQuantity + delta);
            }
        }

        _context.OrderItems.RemoveRange(order.Items);
        order.Items = newLines;
        order.CustomerId = customer.Id;
        order.OrderStatus = newStatus;
        order.PaymentStatus = paymentStatus;

        var addrList = new List<string>();
        if (!string.IsNullOrWhiteSpace(req.Address)) addrList.Add(req.Address.Trim());
        if (!string.IsNullOrWhiteSpace(req.Area)) addrList.Add(req.Area.Trim());
        if (!string.IsNullOrWhiteSpace(req.City)) addrList.Add(req.City.Trim());
        var shippingAddress = string.Join(", ", addrList);
        if (!string.IsNullOrWhiteSpace(req.Note))
        {
            shippingAddress += $" (Note: {req.Note.Trim()})";
        }
        order.ShippingAddressJson = shippingAddress;

        var total = req.Total ?? order.TotalAmount;
        var delivery = req.Delivery ?? order.ShippingFee;
        order.SubTotal = total > delivery ? total - delivery : total;
        order.ShippingFee = delivery;
        order.TotalAmount = total;

        await _context.SaveChangesAsync();
    }

    [HttpPost("{id}/notes")]
    [HttpPut("{id}/notes")]
    public async Task<IActionResult> AddOrderNote(string id, [FromBody] AddOrderNoteRequest req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Text))
        {
            return BadRequest(new { Message = "Note text cannot be empty." });
        }

        var cleanIdStr = id.Replace("ORD-", "");
        var isGuid = Guid.TryParse(cleanIdStr, out var g);
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderNumber == id || o.OrderNumber == $"ORD-{id}" || (isGuid && o.Id == g));

        if (order == null)
        {
            return NotFound(new { Message = $"Order '{id}' not found." });
        }

        var timeStr = DateTime.UtcNow.ToString("MMM dd, hh:mm tt");
        var noteEntry = $"Note: {req.Text.Trim()} (by {req.Author ?? "Admin"} at {timeStr})";
        order.ShippingAddressJson = (order.ShippingAddressJson ?? string.Empty) + "\n" + noteEntry;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, id });
    }
}
