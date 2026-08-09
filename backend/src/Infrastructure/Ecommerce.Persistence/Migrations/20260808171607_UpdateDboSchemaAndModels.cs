using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDboSchemaAndModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.RenameTable(
                name: "WishlistItems",
                newName: "WishlistItems",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "WebsiteSettings",
                newName: "WebsiteSettings",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "Users",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "ShippingMethods",
                newName: "ShippingMethods",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Reviews",
                newName: "Reviews",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "RefreshTokens",
                newName: "RefreshTokens",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "ProductVariants",
                newName: "ProductVariants",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Products",
                newName: "Products",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "ProductImages",
                newName: "ProductImages",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Orders",
                newName: "Orders",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "OrderItems",
                newName: "OrderItems",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Notifications",
                newName: "Notifications",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "LandingPages",
                newName: "LandingPages",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Inventories",
                newName: "Inventories",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Customers",
                newName: "Customers",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Coupons",
                newName: "Coupons",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Categories",
                newName: "Categories",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Brands",
                newName: "Brands",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Banners",
                newName: "Banners",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "AuditLogs",
                newName: "AuditLogs",
                newSchema: "dbo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "WishlistItems",
                schema: "dbo",
                newName: "WishlistItems");

            migrationBuilder.RenameTable(
                name: "WebsiteSettings",
                schema: "dbo",
                newName: "WebsiteSettings");

            migrationBuilder.RenameTable(
                name: "Users",
                schema: "dbo",
                newName: "Users");

            migrationBuilder.RenameTable(
                name: "ShippingMethods",
                schema: "dbo",
                newName: "ShippingMethods");

            migrationBuilder.RenameTable(
                name: "Reviews",
                schema: "dbo",
                newName: "Reviews");

            migrationBuilder.RenameTable(
                name: "RefreshTokens",
                schema: "dbo",
                newName: "RefreshTokens");

            migrationBuilder.RenameTable(
                name: "ProductVariants",
                schema: "dbo",
                newName: "ProductVariants");

            migrationBuilder.RenameTable(
                name: "Products",
                schema: "dbo",
                newName: "Products");

            migrationBuilder.RenameTable(
                name: "ProductImages",
                schema: "dbo",
                newName: "ProductImages");

            migrationBuilder.RenameTable(
                name: "Orders",
                schema: "dbo",
                newName: "Orders");

            migrationBuilder.RenameTable(
                name: "OrderItems",
                schema: "dbo",
                newName: "OrderItems");

            migrationBuilder.RenameTable(
                name: "Notifications",
                schema: "dbo",
                newName: "Notifications");

            migrationBuilder.RenameTable(
                name: "LandingPages",
                schema: "dbo",
                newName: "LandingPages");

            migrationBuilder.RenameTable(
                name: "Inventories",
                schema: "dbo",
                newName: "Inventories");

            migrationBuilder.RenameTable(
                name: "Customers",
                schema: "dbo",
                newName: "Customers");

            migrationBuilder.RenameTable(
                name: "Coupons",
                schema: "dbo",
                newName: "Coupons");

            migrationBuilder.RenameTable(
                name: "Categories",
                schema: "dbo",
                newName: "Categories");

            migrationBuilder.RenameTable(
                name: "Brands",
                schema: "dbo",
                newName: "Brands");

            migrationBuilder.RenameTable(
                name: "Banners",
                schema: "dbo",
                newName: "Banners");

            migrationBuilder.RenameTable(
                name: "AuditLogs",
                schema: "dbo",
                newName: "AuditLogs");
        }
    }
}
