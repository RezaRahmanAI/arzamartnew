namespace Ecommerce.Application.Common.Interfaces;

public interface IStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string folderName, CancellationToken ct = default);
    Task<ImageUploadResult> UploadAndOptimizeImageAsync(Stream fileStream, string fileName, string folderName, CancellationToken ct = default);
    Task DeleteFileAsync(string fileUrl, CancellationToken ct = default);
}

