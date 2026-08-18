using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
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
    public async Task<IActionResult> Upload([FromForm] UploadFileRequest request, CancellationToken ct = default)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { Message = "No file was provided for upload." });
        }

        // Limit file size to 25 MB max
        if (request.File.Length > 25 * 1024 * 1024)
        {
            return BadRequest(new { Message = "File size exceeds the 25 MB limit." });
        }

        try
        {
            using var stream = request.File.OpenReadStream();
            var result = await _storageService.UploadAndOptimizeImageAsync(
                stream,
                request.File.FileName,
                request.Folder,
                ct);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var fullUrl = $"{baseUrl}{result.RelativeUrl}";

            return Ok(new
            {
                url = fullUrl,
                relativeUrl = result.RelativeUrl,
                variants = new
                {
                    large = $"{baseUrl}{result.Variants.Large}",
                    medium = $"{baseUrl}{result.Variants.Medium}",
                    thumb = $"{baseUrl}{result.Variants.Thumb}"
                },
                relativeVariants = result.Variants,
                width = result.Width,
                height = result.Height,
                format = result.Format,
                originalSize = result.OriginalSize,
                optimizedSize = result.OptimizedSize,
                compressionRatio = result.OriginalSize > 0 
                    ? Math.Round((1.0 - (double)result.OptimizedSize / result.OriginalSize) * 100, 1) 
                    : 0
            });
        }
        catch (InvalidDataException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                Message = "Image processing and optimization failed.",
                Details = ex.Message
            });
        }
    }
}

