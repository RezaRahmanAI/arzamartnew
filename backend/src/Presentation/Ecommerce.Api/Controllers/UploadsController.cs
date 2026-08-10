using Ecommerce.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UploadsController : ControllerBase
{
    private readonly IStorageService _storageService;

    public UploadsController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpPost]
    public async Task<IActionResult> Upload([FromForm] IFormFile? file, [FromForm] string folder = "products")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { Message = "No file was provided for upload." });
        }

        using var stream = file.OpenReadStream();
        var url = await _storageService.UploadFileAsync(stream, file.FileName, folder);
        return Ok(new { url });
    }
}
