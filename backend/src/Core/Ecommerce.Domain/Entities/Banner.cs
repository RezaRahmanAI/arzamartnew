using Ecommerce.Domain.Common;

namespace Ecommerce.Domain.Entities;

public class Banner : BaseEntity<int>
{
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public string Position { get; set; } = "slider";
}
