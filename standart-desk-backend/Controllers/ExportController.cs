using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.Models;
using System.Text;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<ExportController> _logger;

    public ExportController(ApplicationDbContext db, ILogger<ExportController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Export tasks to CSV (Excel compatible)
    /// Status: 0=To Do, 1=In Progress, 2=In Review, 3=Done, null=all
    /// </summary>
    [HttpGet("tasks/csv")]
    public async Task<IActionResult> ExportTasksToCsv([FromQuery] int? status = null)
    {
        try
        {
            var query = _db.Tasks
                .Include(t => t.CreatedByUser)
                .Include(t => t.AssignedToUser)
                .AsQueryable();

            // Filter by status if provided
            if (status.HasValue)
            {
                query = query.Where(t => (int)t.Status == status.Value);
            }

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            // Build CSV
            var csv = new StringBuilder();
            csv.AppendLine("ID,Title,Description,Status,Priority,Assigned To,Created By,Due Date,Created At,Updated At");

            foreach (var task in tasks)
            {
                var statusName = task.Status.ToString();
                var priorityName = task.Priority.ToString();
                var assignedTo = task.AssignedToUser?.FullName ?? task.AssignedToUser?.Username ?? "Unassigned";
                var createdBy = task.CreatedByUser?.FullName ?? task.CreatedByUser?.Username ?? "Unknown";
                var dueDate = task.DueDate?.ToString("yyyy-MM-dd") ?? "";
                var createdAt = task.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                var updatedAt = task.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";

                // Escape quotes in text fields
                var title = EscapeCsv(task.Title);
                var description = EscapeCsv(task.Description ?? "");

                csv.AppendLine($"{task.Id},\"{title}\",\"{description}\",{statusName},{priorityName},{assignedTo},{createdBy},{dueDate},{createdAt},{updatedAt}");
            }

            var fileName = $"tasks-export-{DateTime.Now:yyyy-MM-dd-HHmmss}.csv";
            var contentType = "text/csv";
            var fileBytes = Encoding.UTF8.GetBytes(csv.ToString());

            _logger.LogInformation("Tasks exported to CSV: {Count} tasks", tasks.Count);

            return File(fileBytes, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting tasks to CSV");
            return StatusCode(500, new { message = "Error exporting tasks" });
        }
    }

    /// <summary>
    /// Export tasks to JSON
    /// Status: 0=To Do, 1=In Progress, 2=In Review, 3=Done, null=all
    /// </summary>
    [HttpGet("tasks/json")]
    public async Task<IActionResult> ExportTasksToJson([FromQuery] int? status = null)
    {
        try
        {
            var query = _db.Tasks
                .Include(t => t.CreatedByUser)
                .Include(t => t.AssignedToUser)
                .AsQueryable();

            // Filter by status if provided
            if (status.HasValue)
            {
                query = query.Where(t => (int)t.Status == status.Value);
            }

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    id = t.Id,
                    title = t.Title,
                    description = t.Description,
                    status = t.Status.ToString(),
                    priority = t.Priority.ToString(),
                    assignedTo = new
                    {
                        id = t.AssignedToUserId,
                        name = t.AssignedToUser!.FullName ?? t.AssignedToUser.Username
                    },
                    createdBy = new
                    {
                        id = t.CreatedByUserId,
                        name = t.CreatedByUser!.FullName ?? t.CreatedByUser.Username
                    },
                    dueDate = t.DueDate,
                    createdAt = t.CreatedAt,
                    updatedAt = t.UpdatedAt
                })
                .ToListAsync();

            var fileName = $"tasks-export-{DateTime.Now:yyyy-MM-dd-HHmmss}.json";
            var fileBytes = Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(tasks, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));

            _logger.LogInformation("Tasks exported to JSON: {Count} tasks", tasks.Count);

            return File(fileBytes, "application/json", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting tasks to JSON");
            return StatusCode(500, new { message = "Error exporting tasks" });
        }
    }

    private string EscapeCsv(string field)
    {
        if (string.IsNullOrEmpty(field)) return field;
        
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
        {
            return field.Replace("\"", "\"\"");
        }
        return field;
    }
}
