using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLandingPageSectionsBuilder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CallButtonText",
                schema: "dbo",
                table: "LandingPages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DeliveryCharge",
                schema: "dbo",
                table: "LandingPages",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ReviewsJson",
                schema: "dbo",
                table: "LandingPages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SectionsJson",
                schema: "dbo",
                table: "LandingPages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Subtitle",
                schema: "dbo",
                table: "LandingPages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "dbo",
                table: "LandingPages",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CallButtonText",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "DeliveryCharge",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "ReviewsJson",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "SectionsJson",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "Subtitle",
                schema: "dbo",
                table: "LandingPages");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "dbo",
                table: "LandingPages");
        }
    }
}
