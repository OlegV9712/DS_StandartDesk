using Newtonsoft.Json;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.Models;

namespace StandartDesk.Services;

public interface IAuditService
{
    Task LogActionAsync(int userId, string action, string entityType, int? projectId = null,
        int? pageId = null, int? blockSchemaId = null, object? oldValue = null, object? newValue = null,
        string? metadata = null);
    Task<List<AuditLog>> GetAuditLogsAsync(int? projectId = null, int? userId = null, int limit = 100);
    Task<List<AuditLog>> GetBlockSchemaHistoryAsync(int blockSchemaId);
}

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(ApplicationDbContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogActionAsync(int userId, string action, string entityType, int? projectId = null,
        int? pageId = null, int? blockSchemaId = null, object? oldValue = null, object? newValue = null,
        string? metadata = null)
    {
        try
        {
            var auditLog = new AuditLog
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                ProjectId = projectId,
                PageId = pageId,
                BlockSchemaId = blockSchemaId,
                OldValue = oldValue != null ? JsonConvert.SerializeObject(oldValue) : null,
                NewValue = newValue != null ? JsonConvert.SerializeObject(newValue) : null,
                Metadata = metadata,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Audit logged: User {UserId}, Action: {Action}, Entity: {EntityType}",
                userId, action, entityType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging audit action");
        }
    }

    public async Task<List<AuditLog>> GetAuditLogsAsync(int? projectId = null, int? userId = null, int limit = 100)
    {
        var query = _context.AuditLogs.Include(al => al.User).AsQueryable();

        if (projectId.HasValue)
            query = query.Where(al => al.ProjectId == projectId);

        if (userId.HasValue)
            query = query.Where(al => al.UserId == userId);

        return await query
            .OrderByDescending(al => al.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<AuditLog>> GetBlockSchemaHistoryAsync(int blockSchemaId)
    {
        return await _context.AuditLogs
            .Include(al => al.User)
            .Where(al => al.BlockSchemaId == blockSchemaId)
            .OrderByDescending(al => al.CreatedAt)
            .ToListAsync();
    }
}
