using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderListIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProductId",
                schema: "dbo",
                table: "LandingPages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CreatedAtUtc",
                schema: "dbo",
                table: "Orders",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_LandingPages_ProductId",
                schema: "dbo",
                table: "LandingPages",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_LandingPages_Products_ProductId",
                schema: "dbo",
                table: "LandingPages",
                column: "ProductId",
                principalSchema: "dbo",
                principalTable: "Products",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LandingPages_Products_ProductId",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CreatedAtUtc",
                schema: "dbo",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_LandingPages_ProductId",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "ProductId",
                schema: "dbo",
                table: "LandingPages");
        }
    }
}
