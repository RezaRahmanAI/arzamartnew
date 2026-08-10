using Ecommerce.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.Api.Controllers;

public class UploadFileRequest
{
    public IFormFile? File { get; set; }
    public string Folder { get; set; } = "products";
}

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
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] UploadFileRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { Message = "No file was provided for upload." });
        }

        using var stream = request.File.OpenReadStream();
        var url = await _storageService.UploadFileAsync(stream, request.File.FileName, request.Folder);
        return Ok(new { url });
    }
}
