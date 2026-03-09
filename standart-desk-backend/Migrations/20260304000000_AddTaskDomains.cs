using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandartDesk.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskDomains : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create TaskDomains table
            migrationBuilder.CreateTable(
                name: "TaskDomains",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Color = table.Column<string>(type: "TEXT", nullable: true),
                    Icon = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskDomains", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskDomains_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Create TaskDomainAccess table
            migrationBuilder.CreateTable(
                name: "TaskDomainAccess",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TaskDomainId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    CanView = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanEdit = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanDelete = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsManager = table.Column<bool>(type: "INTEGER", nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskDomainAccess", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskDomainAccess_TaskDomains_TaskDomainId",
                        column: x => x.TaskDomainId,
                        principalTable: "TaskDomains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskDomainAccess_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Add TaskDomainId column to Tasks table
            migrationBuilder.AddColumn<int>(
                name: "TaskDomainId",
                table: "Tasks",
                type: "INTEGER",
                nullable: true);

            // Add foreign key for TaskDomainId
            migrationBuilder.CreateIndex(
                name: "IX_Tasks_TaskDomainId",
                table: "Tasks",
                column: "TaskDomainId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_TaskDomains_TaskDomainId",
                table: "Tasks",
                column: "TaskDomainId",
                principalTable: "TaskDomains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Create indexes
            migrationBuilder.CreateIndex(
                name: "IX_TaskDomains_Name",
                table: "TaskDomains",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskDomains_IsActive",
                table: "TaskDomains",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDomainAccess_TaskDomainId_UserId",
                table: "TaskDomainAccess",
                columns: new[] { "TaskDomainId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskDomainAccess_UserId",
                table: "TaskDomainAccess",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key and index from Tasks table
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_TaskDomains_TaskDomainId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_TaskDomainId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "TaskDomainId",
                table: "Tasks");

            // Drop TaskDomainAccess table
            migrationBuilder.DropTable(
                name: "TaskDomainAccess");

            // Drop TaskDomains table
            migrationBuilder.DropTable(
                name: "TaskDomains");
        }
    }
}
