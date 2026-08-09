using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Customer : BaseEntity
{
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? GoogleId { get; set; }
    public string? DefaultAddress { get; set; }
    public string District { get; set; } = "Dhaka";
    public bool IsGuest { get; set; } = false;

    public User? User { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
