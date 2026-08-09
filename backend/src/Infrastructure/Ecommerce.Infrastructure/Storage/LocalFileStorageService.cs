using Ecommerce.Application.Common.Interfaces;

namespace Ecommerce.Infrastructure.Storage;

public class LocalFileStorageService : IStorageService
{
    private readonly string _uploadBasePath;

    public LocalFileStorageService()
    {
        // Target wwwroot/uploads directory in the Web API project
        _uploadBasePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        if (!Directory.Exists(_uploadBasePath))
        {
            Directory.CreateDirectory(_uploadBasePath);
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string folderName, CancellationToken ct = default)
    {
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

    public Task DeleteFileAsync(string fileUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return Task.CompletedTask;

        var relativePath = fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
