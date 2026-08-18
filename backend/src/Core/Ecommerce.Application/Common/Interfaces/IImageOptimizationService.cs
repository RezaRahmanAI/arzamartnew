namespace Ecommerce.Application.Common.Interfaces;

public class ImageVariantUrls
{
    public string Large { get; set; } = string.Empty;
    public string Medium { get; set; } = string.Empty;
    public string Thumb { get; set; } = string.Empty;
    public string? Original { get; set; }
}

public class ImageUploadResult
{
    public string Url { get; set; } = string.Empty;
    public string RelativeUrl { get; set; } = string.Empty;
    public ImageVariantUrls Variants { get; set; } = new();
    public int Width { get; set; }
    public int Height { get; set; }
    public string Format { get; set; } = "webp";
    public long OriginalSize { get; set; }
    public long OptimizedSize { get; set; }
}

public interface IImageOptimizationService
{
    bool IsValidImageSignature(Stream stream);
    Task<ImageUploadResult> ProcessAndSaveImageAsync(Stream inputStream, string originalFileName, string folderName, CancellationToken ct = default);
}
