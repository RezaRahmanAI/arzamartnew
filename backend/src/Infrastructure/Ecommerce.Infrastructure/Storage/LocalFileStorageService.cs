using Ecommerce.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace Ecommerce.Infrastructure.Storage;

public class LocalFileStorageService : IStorageService
{
    private readonly string _webRootPath;
    private readonly string _uploadBasePath;
    private readonly IImageOptimizationService _imageOptimizer;

    public LocalFileStorageService(IWebHostEnvironment env, IImageOptimizationService imageOptimizer)
    {
        _imageOptimizer = imageOptimizer;
        var contentRoot = env.ContentRootPath;
        if (!string.IsNullOrEmpty(env.WebRootPath) && Directory.Exists(env.WebRootPath))
        {
            _webRootPath = env.WebRootPath;
        }
        else if (Directory.Exists(Path.Combine(contentRoot, "webroot")))
        {
            _webRootPath = Path.Combine(contentRoot, "webroot");
        }
        else
        {
            _webRootPath = Path.Combine(contentRoot, "wwwroot");
        }

        if (!Directory.Exists(_webRootPath))
        {
            Directory.CreateDirectory(_webRootPath);
        }

        _uploadBasePath = Path.Combine(_webRootPath, "uploads");
        if (!Directory.Exists(_uploadBasePath))
        {
            Directory.CreateDirectory(_uploadBasePath);
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string folderName, CancellationToken ct = default)
    {
        // If it's an image, optimize automatically
        if (_imageOptimizer.IsValidImageSignature(fileStream))
        {
            var result = await _imageOptimizer.ProcessAndSaveImageAsync(fileStream, fileName, folderName, ct);
            return result.RelativeUrl;
        }

        var targetFolder = Path.Combine(_uploadBasePath, folderName);
        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var filePath = Path.Combine(targetFolder, uniqueFileName);

        using (var outputStream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(outputStream, ct);
        }

        // Return relative URL for static file serving
        return $"/uploads/{folderName}/{uniqueFileName}";
    }

    public async Task<ImageUploadResult> UploadAndOptimizeImageAsync(Stream fileStream, string fileName, string folderName, CancellationToken ct = default)
    {
        return await _imageOptimizer.ProcessAndSaveImageAsync(fileStream, fileName, folderName, ct);
    }

    public Task DeleteFileAsync(string fileUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return Task.CompletedTask;

        var relativePath = fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_webRootPath, relativePath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        // Also clean up sibling variants (-large, -medium, -thumb) if applicable
        if (fullPath.EndsWith("-large.webp", StringComparison.OrdinalIgnoreCase))
        {
            var mediumPath = fullPath.Replace("-large.webp", "-medium.webp", StringComparison.OrdinalIgnoreCase);
            var thumbPath = fullPath.Replace("-large.webp", "-thumb.webp", StringComparison.OrdinalIgnoreCase);
            if (File.Exists(mediumPath)) File.Delete(mediumPath);
            if (File.Exists(thumbPath)) File.Delete(thumbPath);
        }

        return Task.CompletedTask;
    }
}

