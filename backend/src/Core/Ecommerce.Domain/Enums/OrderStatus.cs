namespace Ecommerce.Domain.Enums;

public enum OrderStatus
{
    Pending = 1,
    Processing = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5,
    Confirmed = 6,
    Packed = 7,
    Hold = 8,
    PreOrder = 9,
    Return = 10,
    Exchange = 11,
    Refund = 12,
    ReturnProcess = 13
}
