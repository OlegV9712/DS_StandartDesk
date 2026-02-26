using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditController> _logger;

    public AuditController(IAuditService auditService, ApplicationDbContext context, ILogger<AuditController> logger)
    {
        _auditService = auditService;
        _context = context;
        _logger = logger;
    }

    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<List<AuditLogDto>>> GetProjectAuditLogs(int projectId, [FromQuery] int limit = 100)
    {
        var logs = await _auditService.GetAuditLogsAsync(projectId, null, limit);

        var result = logs.Select(al => new AuditLogDto
        {
            Id = al.Id,
            UserName = al.User?.FullName ?? al.User?.Username ?? "Unknown",
            Action = al.Action,
            EntityType = al.EntityType,
            OldValue = al.OldValue,
            NewValue = al.NewValue,
            Metadata = al.Metadata,
            CreatedAt = al.CreatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<AuditLogDto>>> GetUserAuditLogs(int userId, [FromQuery] int limit = 100)
    {
        var logs = await _auditService.GetAuditLogsAsync(null, userId, limit);

        var result = logs.Select(al => new AuditLogDto
        {
            Id = al.Id,
            UserName = al.User?.FullName ?? al.User?.Username ?? "Unknown",
            Action = al.Action,
            EntityType = al.EntityType,
            OldValue = al.OldValue,
            NewValue = al.NewValue,
            Metadata = al.Metadata,
            CreatedAt = al.CreatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("blockschema/{blockSchemaId}")]
    public async Task<ActionResult<List<AuditLogDto>>> GetBlockSchemaHistory(int blockSchemaId)
    {
        var logs = await _auditService.GetBlockSchemaHistoryAsync(blockSchemaId);

        var result = logs.Select(al => new AuditLogDto
        {
            Id = al.Id,
            UserName = al.User?.FullName ?? al.User?.Username ?? "Unknown",
            Action = al.Action,
            EntityType = al.EntityType,
            OldValue = al.OldValue,
            NewValue = al.NewValue,
            Metadata = al.Metadata,
            CreatedAt = al.CreatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("")]
    public async Task<ActionResult<List<AuditLogDto>>> GetAllAuditLogs(
        [FromQuery] int? projectId = null,
        [FromQuery] int? userId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var logPrefix = $"[GET_LOGS] Page {page}, Size {pageSize}";
        try
        {
            _logger.LogInformation($"{logPrefix} - Fetching audit logs");

            var logs = await _auditService.GetAuditLogsAsync(projectId, userId, pageSize * page);
            var paginatedLogs = logs.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            _logger.LogInformation($"{logPrefix} - Retrieved {paginatedLogs.Count} logs");

            var result = paginatedLogs.Select(al => new AuditLogDto
            {
                Id = al.Id,
                UserName = al.User?.FullName ?? al.User?.Username ?? "Unknown",
                Action = al.Action,
                EntityType = al.EntityType,
                OldValue = al.OldValue,
                NewValue = al.NewValue,
                Metadata = al.Metadata,
                CreatedAt = al.CreatedAt
            }).ToList();

            return Ok(new
            {
                items = result,
                total = logs.Count,
                page = page,
                pageSize = pageSize
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error retrieving logs" });
        }
    }
}
