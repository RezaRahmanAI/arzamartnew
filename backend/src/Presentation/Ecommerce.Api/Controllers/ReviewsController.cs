using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.Api.Controllers;

public class ReviewDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProductSlug { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public string Comment { get; set; } = string.Empty;
    public string Date { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
}

[ApiController]
[Route("api/v1/[controller]")]
public class ReviewsController : ControllerBase
{
    private static readonly List<ReviewDto> _reviews = new()
    {
        new ReviewDto
        {
            Id = "rev-1",
            ProductSlug = "midnight-heavy-tee",
            ProductName = "Midnight Heavyweight Tee",
            CustomerName = "Tanvir Rahman",
            Rating = 5,
            Comment = "Excellent quality! The heavyweight cotton feels incredibly premium and holds its shape perfectly.",
            Date = "2026-08-01",
        },
        new ReviewDto
        {
            Id = "rev-2",
            ProductSlug = "oxford-cotton-shirt",
            ProductName = "Oxford Cotton Shirt",
            CustomerName = "Sabbir Hossain",
            Rating = 4,
            Comment = "Great fitting shirt for office and casual wear. Fabric breathability is top notch.",
            Date = "2026-08-03",
        }
    };

    [HttpGet]
    public IActionResult GetReviews()
    {
        return Ok(_reviews);
    }

    [HttpPost]
    public IActionResult CreateReview([FromBody] ReviewDto review)
    {
        review.Id = $"rev-{Guid.NewGuid().ToString()[..8]}";
        review.Date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        _reviews.Insert(0, review);
        return CreatedAtAction(nameof(GetReviews), new { id = review.Id }, review);
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteReview(string id)
    {
        var existing = _reviews.FirstOrDefault(r => r.Id == id);
        if (existing != null)
        {
            _reviews.Remove(existing);
        }
        return NoContent();
    }
}
