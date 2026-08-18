using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Ecommerce.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Ecommerce.Infrastructure.Storage;

public class ImageOptimizationService : IImageOptimizationService
{
    private readonly string _webRootPath;
    private readonly string _uploadBasePath;
    private readonly ILogger<ImageOptimizationService> _logger;

    // Configurable quality settings
    private static readonly WebpEncoder LargeEncoder = new() { Quality = 82, FileFormat = WebpFileFormatType.Lossy };
    private static readonly WebpEncoder MediumEncoder = new() { Quality = 80, FileFormat = WebpFileFormatType.Lossy };
    private static readonly WebpEncoder ThumbEncoder = new() { Quality = 78, FileFormat = WebpFileFormatType.Lossy };

    public ImageOptimizationService(IWebHostEnvironment env, ILogger<ImageOptimizationService> logger)
    {
        _logger = logger;
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

    /// <summary>
    /// Validates real file signature (magic bytes) to guarantee the uploaded stream is a genuine image.
    /// </summary>
    public bool IsValidImageSignature(Stream stream)
    {
        if (stream == null || !stream.CanRead || stream.Length < 4)
        {
            return false;
        }

        var header = new byte[16];
        var originalPos = stream.CanSeek ? stream.Position : 0;

        try
        {
            var read = stream.Read(header, 0, header.Length);
            if (read < 4) return false;

            // JPEG: FF D8 FF
            if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return true;

            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (read >= 8 &&
                header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) return true;

            // GIF: GIF87a or GIF89a (47 49 46 38)
            if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38) return true;

            // WebP: 'RIFF' .... 'WEBP'
            if (read >= 12 &&
                header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) return true;

            // BMP: 42 4D ('BM')
            if (header[0] == 0x42 && header[1] == 0x4D) return true;

            // TIFF: II*. (49 49 2A 00) or MM.* (4D 4D 00 2A)
            if ((header[0] == 0x49 && header[1] == 0x49 && header[2] == 0x2A && header[3] == 0x00) ||
                (header[0] == 0x4D && header[1] == 0x4D && header[2] == 0x00 && header[3] == 0x2A)) return true;

            // HEIF / HEIC / AVIF: ftyp box at offset 4 (66 74 79 70)
            if (read >= 12 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) return true;

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error reading image signature header.");
            return false;
        }
        finally
        {
            if (stream.CanSeek)
            {
                stream.Position = originalPos;
            }
        }
    }

    /// <summary>
    /// Processes uploaded image: validates, auto-orients, strips metadata,
    /// resizes to responsive tiers (Large ~1600px, Medium ~800px, Thumb ~300px),
    /// and saves as WebP variants.
    /// </summary>
    public async Task<ImageUploadResult> ProcessAndSaveImageAsync(
        Stream inputStream,
        string originalFileName,
        string folderName,
        CancellationToken ct = default)
    {
        if (inputStream == null || inputStream.Length == 0)
        {
            throw new ArgumentException("Input image stream is empty.", nameof(inputStream));
        }

        var originalSize = inputStream.Length;

        // 1. Signature Check
        if (!IsValidImageSignature(inputStream))
        {
            throw new InvalidDataException("The uploaded file does not have a valid image signature (JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, AVIF).");
        }

        // 2. Prepare target directory
        var safeFolder = string.IsNullOrWhiteSpace(folderName) ? "general" : Regex.Replace(folderName, @"[^a-zA-Z0-9_\-]", "");
        var targetDir = Path.Combine(_uploadBasePath, safeFolder);
        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        // Generate base unique filename
        var rawName = Path.GetFileNameWithoutExtension(originalFileName);
        var cleanName = Regex.Replace(rawName, @"[^a-zA-Z0-9_\-]", "-").Trim('-').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(cleanName)) cleanName = "image";
        if (cleanName.Length > 40) cleanName = cleanName[..40];

        var fileId = $"{Guid.NewGuid():N}_{cleanName}";

        // Variant file names
        var largeFileName = $"{fileId}-large.webp";
        var mediumFileName = $"{fileId}-medium.webp";
        var thumbFileName = $"{fileId}-thumb.webp";

        var largeFilePath = Path.Combine(targetDir, largeFileName);
        var mediumFilePath = Path.Combine(targetDir, mediumFileName);
        var thumbFilePath = Path.Combine(targetDir, thumbFileName);

        // 3. Load & Process with ImageSharp
        using var memoryStream = new MemoryStream();
        if (inputStream.CanSeek) inputStream.Position = 0;
        await inputStream.CopyToAsync(memoryStream, ct);
        memoryStream.Position = 0;

        using var image = await Image.LoadAsync(memoryStream, ct);

        // Auto-orient based on EXIF before stripping metadata
        image.Mutate(x => x.AutoOrient());

        // Strip EXIF / ICC / XMP / IPTC metadata for privacy & minimal size
        image.Metadata.ExifProfile = null;
        image.Metadata.IccProfile = null;
        image.Metadata.XmpProfile = null;
        image.Metadata.IptcProfile = null;

        var origWidth = image.Width;
        var origHeight = image.Height;

        // 4. Generate Responsive Variants concurrently
        // Tier 1: Large (Max 1600px, quality 82)
        var largeTask = Task.Run(async () =>
        {
            using var cloneLarge = image.Clone(ctx =>
            {
                if (origWidth > 1600 || origHeight > 1600)
                {
                    ctx.Resize(new ResizeOptions
                    {
                        Size = new Size(1600, 1600),
                        Mode = ResizeMode.Max,
                        PremultiplyAlpha = true
                    });
                }
            });
            await cloneLarge.SaveAsWebpAsync(largeFilePath, LargeEncoder, ct);
        }, ct);

        // Tier 2: Medium (Max 800px, quality 80)
        var mediumTask = Task.Run(async () =>
        {
            using var cloneMedium = image.Clone(ctx =>
            {
                if (origWidth > 800 || origHeight > 800)
                {
                    ctx.Resize(new ResizeOptions
                    {
                        Size = new Size(800, 800),
                        Mode = ResizeMode.Max,
                        PremultiplyAlpha = true
                    });
                }
            });
            await cloneMedium.SaveAsWebpAsync(mediumFilePath, MediumEncoder, ct);
        }, ct);

        // Tier 3: Thumb (Max 300px, quality 78)
        var thumbTask = Task.Run(async () =>
        {
            using var cloneThumb = image.Clone(ctx =>
            {
                if (origWidth > 300 || origHeight > 300)
                {
                    ctx.Resize(new ResizeOptions
                    {
                        Size = new Size(300, 300),
                        Mode = ResizeMode.Max,
                        PremultiplyAlpha = true
                    });
                }
            });
            await cloneThumb.SaveAsWebpAsync(thumbFilePath, ThumbEncoder, ct);
        }, ct);

        await Task.WhenAll(largeTask, mediumTask, thumbTask);

        long optimizedSize = 0;
        if (File.Exists(largeFilePath))
        {
            optimizedSize = new FileInfo(largeFilePath).Length;
        }

        var relativeLarge = $"/uploads/{safeFolder}/{largeFileName}";
        var relativeMedium = $"/uploads/{safeFolder}/{mediumFileName}";
        var relativeThumb = $"/uploads/{safeFolder}/{thumbFileName}";

        _logger.LogInformation("Image optimized: {OriginalName} ({OriginalSize} B) -> WebP Large ({OptimizedSize} B). Saved 3 responsive tiers.",
            originalFileName, originalSize, optimizedSize);

        return new ImageUploadResult
        {
            Url = relativeLarge,
            RelativeUrl = relativeLarge,
            Variants = new ImageVariantUrls
            {
                Large = relativeLarge,
                Medium = relativeMedium,
                Thumb = relativeThumb
            },
            Width = Math.Min(origWidth, 1600),
            Height = Math.Min(origHeight, 1600),
            Format = "webp",
            OriginalSize = originalSize,
            OptimizedSize = optimizedSize
        };
    }
}
