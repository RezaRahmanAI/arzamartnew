using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class IncompleteOrder : BaseEntity
{
    public string OrderId { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string OrderJson { get; set; } = "{}";
}