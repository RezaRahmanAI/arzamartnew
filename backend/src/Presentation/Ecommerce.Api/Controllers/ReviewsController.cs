using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ReviewsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetReviews([FromQuery] Guid? productId = null)
    {
        var query = _context.Reviews
            .AsNoTracking()
            .Where(r => r.IsApproved)
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(r => r.ProductId == productId.Value);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Select(r => new
            {
                id = r.Id,
                productId = r.ProductId,
                productSlug = r.Product != null ? r.Product.Slug : null,
                productName = r.Product != null ? r.Product.Name : null,
                customerName = r.User != null ? r.User.FirstName + " " + r.User.LastName : null,
                rating = r.Rating,
                comment = r.Comment,
                date = r.CreatedAtUtc.ToString("yyyy-MM-dd")
            })
            .ToListAsync();

        return Ok(reviews);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetReview(int id)
    {
        var review = await _context.Reviews
            .AsNoTracking()
            .Include(r => r.Product)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null) return NotFound();

        return Ok(new
        {
            id = review.Id,
            productId = review.ProductId,
            productSlug = review.Product?.Slug,
            productName = review.Product?.Name,
            customerName = review.User != null ? review.User.FirstName + " " + review.User.LastName : null,
            rating = review.Rating,
            comment = review.Comment,
            date = review.CreatedAtUtc.ToString("yyyy-MM-dd")
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest req)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Slug == req.ProductSlug);
        if (product == null)
            return BadRequest(new { Message = $"Product '{req.ProductSlug}' not found." });

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == req.CustomerPhone);
        if (customer == null)
            return BadRequest(new { Message = $"No customer found with phone '{req.CustomerPhone}'." });

        if (!customer.UserId.HasValue)
            return BadRequest(new { Message = "Customer has no linked user account." });

        var review = new Review
        {
            ProductId = product.Id,
            UserId = customer.UserId.Value,
            Rating = Math.Clamp(req.Rating, 1, 5),
            Comment = req.Comment ?? string.Empty,
            IsApproved = true
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(customer.UserId.Value);

        return CreatedAtAction(nameof(GetReview), new { id = review.Id }, new
        {
            id = review.Id,
            productId = review.ProductId,
            productSlug = product.Slug,
            productName = product.Name,
            customerName = user != null ? user.FirstName + " " + user.LastName : customer.FullName,
            rating = review.Rating,
            comment = review.Comment,
            date = review.CreatedAtUtc.ToString("yyyy-MM-dd")
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound();

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateReviewRequest
{
    public string ProductSlug { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public string? Comment { get; set; }
}
