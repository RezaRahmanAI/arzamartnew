using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomLandingPageConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LandingPages",
                schema: "dbo");

            migrationBuilder.CreateTable(
                name: "CustomLandingPageConfigs",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelativeTimerTotalMinutes = table.Column<int>(type: "int", nullable: true),
                    IsTimerVisible = table.Column<bool>(type: "bit", nullable: false),
                    HeaderTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsProductDetailsVisible = table.Column<bool>(type: "bit", nullable: false),
                    ProductDetailsTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsFabricVisible = table.Column<bool>(type: "bit", nullable: false),
                    IsDesignVisible = table.Column<bool>(type: "bit", nullable: false),
                    IsTrustBannerVisible = table.Column<bool>(type: "bit", nullable: false),
                    TrustBannerText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrustBannerDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsFeaturedOrderVisible = table.Column<bool>(type: "bit", nullable: false),
                    FeaturedProductName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PromoPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    OriginalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PromoText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FreeShippingThresholdQuantity = table.Column<int>(type: "int", nullable: true),
                    IsMarqueeVisible = table.Column<bool>(type: "bit", nullable: false),
                    MarqueeText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SectionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomLandingPageConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomLandingPageConfigs_Products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "dbo",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomLandingPageConfigs_ProductId",
                schema: "dbo",
                table: "CustomLandingPageConfigs",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomLandingPageConfigs",
                schema: "dbo");

            migrationBuilder.CreateTable(
                name: "LandingPages",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CallButtonText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeliveryCharge = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    HeroImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HeroSubtitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HeroTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OldPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ReviewsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SectionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Slug = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SpecialPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Subtitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LandingPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LandingPages_Products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "dbo",
                        principalTable: "Products",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_LandingPages_ProductId",
                schema: "dbo",
                table: "LandingPages",
                column: "ProductId");
        }
    }
}
