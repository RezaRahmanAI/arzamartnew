using Ecommerce.Application.Features.Products.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ISender _mediator;

    public ProductsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 12, [FromQuery] string? search = null, [FromQuery] int? categoryId = null)
    {
        var result = await _mediator.Send(new GetProductsPagedQuery(pageIndex, pageSize, search, categoryId));
        return Ok(result);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetProductBySlug(string slug)
    {
        var result = await _mediator.Send(new GetProductBySlugQuery(slug));
        return result.IsSuccess ? Ok(result) : NotFound(result);
    }
}
