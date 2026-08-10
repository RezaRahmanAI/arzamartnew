using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceOptimizationIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_CategoryId_CreatedAtUtc",
                schema: "dbo",
                table: "Products",
                columns: new[] { "IsActive", "CategoryId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderStatus_CreatedAtUtc",
                schema: "dbo",
                table: "Orders",
                columns: new[] { "OrderStatus", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_CategoryId_CreatedAtUtc",
                schema: "dbo",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Orders_OrderStatus_CreatedAtUtc",
                schema: "dbo",
                table: "Orders");
        }
    }
}
