using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Common.Models;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Features.Orders.Commands;

public record CreateOrderItemDto(Guid ProductId, Guid? VariantId, int Quantity);

public record CreateOrderCommand(
    Guid CustomerId,
    List<CreateOrderItemDto> Items,
    string ShippingAddressJson,
    string? CouponCode
) : IRequest<Result<CreatedOrderResultDto>>;

public record CreatedOrderResultDto(Guid Id, string OrderNumber, decimal TotalAmount, string OrderStatus, DateTime CreatedAtUtc);

public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("Cart items cannot be empty.");
        RuleFor(x => x.ShippingAddressJson).NotEmpty();
    }
}

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Result<CreatedOrderResultDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateOrderCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CreatedOrderResultDto>> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            decimal subTotal = 0;
            var orderItems = new List<OrderItem>();
            var productRepo = _unitOfWork.Repository<Product>();
            var variantRepo = _unitOfWork.Repository<ProductVariant>();

            foreach (var itemReq in request.Items)
            {
                var product = await productRepo.GetByIdAsync(itemReq.ProductId, cancellationToken);
                if (product == null || !product.IsActive)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                    return Result<CreatedOrderResultDto>.Failure($"Product {itemReq.ProductId} not found.");
                }

                decimal unitPrice = product.DiscountPrice ?? product.BasePrice;

                if (itemReq.VariantId.HasValue)
                {
                    var variant = await variantRepo.GetByIdAsync(itemReq.VariantId.Value, cancellationToken);
                    if (variant == null || !variant.IsActive)
                    {
                        await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                        return Result<CreatedOrderResultDto>.Failure($"Variant {itemReq.VariantId} not found.");
                    }

                    if (variant.StockQuantity < itemReq.Quantity)
                    {
                        await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                        return Result<CreatedOrderResultDto>.Failure($"Insufficient stock for item '{variant.Name}'.");
                    }

                    if (variant.PriceOverride.HasValue) unitPrice = variant.PriceOverride.Value;
                }

                subTotal += unitPrice * itemReq.Quantity;
                orderItems.Add(new OrderItem
                {
                    ProductId = product.Id,
                    VariantId = itemReq.VariantId,
                    ProductName = product.Name,
                    UnitPrice = unitPrice,
                    Quantity = itemReq.Quantity
                });
            }

            decimal discountAmount = 0;
            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var couponRepo = _unitOfWork.Repository<Coupon>();
                var coupons = await couponRepo.FindAsync(c => c.Code == request.CouponCode && c.IsActive && c.ExpirationDate > DateTime.UtcNow, cancellationToken);
                var coupon = coupons.FirstOrDefault();

                if (coupon != null && subTotal >= coupon.MinimumSpend && coupon.UsageCount < coupon.UsageLimit)
                {
                    if (coupon.DiscountAmount.HasValue) discountAmount = coupon.DiscountAmount.Value;
                    else if (coupon.DiscountPercentage.HasValue) discountAmount = subTotal * (coupon.DiscountPercentage.Value / 100m);

                    coupon.UsageCount++;
                    couponRepo.Update(coupon);
                }
            }

            var order = new Order
            {
                OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
                CustomerId = request.CustomerId,
                SubTotal = subTotal,
                DiscountAmount = discountAmount,
                ShippingFee = subTotal > 1000 ? 0 : 60,
                TotalAmount = Math.Max(0, subTotal - discountAmount) + (subTotal > 1000 ? 0 : 60),
                OrderStatus = OrderStatus.Pending,
                PaymentStatus = PaymentStatus.Pending,
                ShippingAddressJson = request.ShippingAddressJson,
                CouponCode = request.CouponCode,
                Items = orderItems
            };

            await _unitOfWork.Repository<Order>().AddAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            return Result<CreatedOrderResultDto>.Success(new CreatedOrderResultDto(
                order.Id,
                order.OrderNumber,
                order.TotalAmount,
                order.OrderStatus.ToString(),
                order.CreatedAtUtc
            ));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            return Result<CreatedOrderResultDto>.Failure($"Order creation failed: {ex.Message}");
        }
    }
}
