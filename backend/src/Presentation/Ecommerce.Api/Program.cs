using System.Text;
using Ecommerce.Api.Middleware;
using Ecommerce.Application.Common.Behaviors;
using Ecommerce.Application.Common.Interfaces;
using Ecommerce.Application.Features.Products.Queries;
using Ecommerce.Infrastructure.Authentication;
using Ecommerce.Infrastructure.Caching;
using Ecommerce.Infrastructure.Messaging;
using Ecommerce.Infrastructure.Storage;
using Ecommerce.Persistence;
using Ecommerce.Persistence.Context;
using Ecommerce.Persistence.Repositories;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection (SQL Server)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=104.234.134.230,52196;Initial Catalog=arzamarttest;Persist Security Info=True;User ID=arzamarttest;Password=F&N67Xmyytokp5u!;Pooling=True;MultipleActiveResultSets=True;Encrypt=False;TrustServerCertificate=True;Command Timeout=30;Connect Timeout=30";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString, b => 
    {
        b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
        b.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });
});

builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));

// 2. Feature-Based Clean Architecture MediatR & FluentValidation Pipeline
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(GetProductsPagedQuery).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(GetProductsPagedQuery).Assembly);

// 3. Infrastructure External Services
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();
builder.Services.AddSingleton<IStorageService, LocalFileStorageService>();

// 3.1. Response Compression (Brotli & Gzip)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});
builder.Services.AddTransient<IEmailService, EmailService>();
builder.Services.AddTransient<ISmsService, SmsService>();

// 4. JWT Authentication Configuration
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "SuperSecretKeyForECommerceEnterprisePlatform2026!";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "EcommerceApi";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "EcommerceClient";

builder.Services.AddSingleton(new JwtTokenGenerator(jwtSecret, jwtIssuer, jwtAudience));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 5. CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 6. Middleware Pipeline — CORS MUST be first so even error responses get CORS headers
app.UseCors("AllowFrontend");

app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Ecommerce API v1");
    c.RoutePrefix = string.Empty;
});

app.UseResponseCompression();

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=2592000, immutable";
    }
});

var webrootFolder = Path.Combine(builder.Environment.ContentRootPath, "webroot");
if (Directory.Exists(webrootFolder))
{
    app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(webrootFolder),
        RequestPath = "",
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=2592000, immutable";
        }
    });
}

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Ensure Database Created, Up to Date & Seeded asynchronously without blocking app startup
_ = Task.Run(async () =>
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        try
        {
            await db.Database.MigrateAsync();
        }
        catch
        {
            await db.Database.EnsureCreatedAsync();
        }

        try
        {
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Banners]') AND name = 'Position') ALTER TABLE [Banners] ADD [Position] nvarchar(max) NOT NULL DEFAULT 'slider';");
            await db.Database.ExecuteSqlRawAsync("UPDATE [Banners] SET [Position] = 'offer' WHERE [TargetUrl] = '/offers' OR [DisplayOrder] = 3;");
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[LandingPages]') AND name = 'ProductId') ALTER TABLE [LandingPages] ADD [ProductId] uniqueidentifier NULL;");
        }
        catch
        {
            /* Column check handled */
        }

        await DbInitializer.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization note: {ex.Message}");
    }
});

app.Run();
