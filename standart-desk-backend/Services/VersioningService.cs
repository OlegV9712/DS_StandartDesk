using Newtonsoft.Json;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.Models;

namespace StandartDesk.Services;

public interface IVersioningService
{
    Task<BlockSchemaVersion> CreateVersionAsync(int blockSchemaId, int userId, string content, string? changeDescription = null);
    Task<BlockSchemaVersion?> GetVersionAsync(int blockSchemaId, int versionNumber);
    Task<List<BlockSchemaVersion>> GetVersionHistoryAsync(int blockSchemaId);
    Task<BlockSchema?> RevertToVersionAsync(int blockSchemaId, int versionNumber, int userId, string? reason = null);
}

public class VersioningService : IVersioningService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<VersioningService> _logger;

    public VersioningService(ApplicationDbContext context, IAuditService auditService, ILogger<VersioningService> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<BlockSchemaVersion> CreateVersionAsync(int blockSchemaId, int userId, string content, string? changeDescription = null)
    {
        var blockSchema = await _context.BlockSchemas.FindAsync(blockSchemaId);
        if (blockSchema == null)
            throw new InvalidOperationException("BlockSchema not found");

        var nextVersion = (await _context.BlockSchemaVersions
            .Where(v => v.BlockSchemaId == blockSchemaId)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0) + 1;

        var version = new BlockSchemaVersion
        {
            BlockSchemaId = blockSchemaId,
            VersionNumber = nextVersion,
            Content = content,
            CreatedByUserId = userId,
            ChangeDescription = changeDescription,
            CreatedAt = DateTime.UtcNow
        };

        _context.BlockSchemaVersions.Add(version);
        blockSchema.Version = nextVersion;
        blockSchema.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            userId,
            "UPDATE",
            "BlockSchema",
            blockSchema.ProjectId,
            blockSchema.PageId,
            blockSchemaId,
            null,
            content,
            JsonConvert.SerializeObject(new { changeDescription, versionNumber = nextVersion })
        );

        _logger.LogInformation(
            "Created version {VersionNumber} for BlockSchema {BlockSchemaId}",
            nextVersion, blockSchemaId);

        return version;
    }

    public async Task<BlockSchemaVersion?> GetVersionAsync(int blockSchemaId, int versionNumber)
    {
        return await _context.BlockSchemaVersions
            .FirstOrDefaultAsync(v => v.BlockSchemaId == blockSchemaId && v.VersionNumber == versionNumber);
    }

    public async Task<List<BlockSchemaVersion>> GetVersionHistoryAsync(int blockSchemaId)
    {
        return await _context.BlockSchemaVersions
            .Where(v => v.BlockSchemaId == blockSchemaId)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();
    }

    public async Task<BlockSchema?> RevertToVersionAsync(int blockSchemaId, int versionNumber, int userId, string? reason = null)
    {
        var blockSchema = await _context.BlockSchemas.FindAsync(blockSchemaId);
        if (blockSchema == null)
            return null;

        var targetVersion = await GetVersionAsync(blockSchemaId, versionNumber);
        if (targetVersion == null)
            return null;

        var oldContent = blockSchema.Content;
        blockSchema.Content = targetVersion.Content;
        blockSchema.UpdatedAt = DateTime.UtcNow;

        // Create a new version for the revert action
        await CreateVersionAsync(blockSchemaId, userId, targetVersion.Content, $"Reverted to version {versionNumber}. Reason: {reason}");

        await _auditService.LogActionAsync(
            userId,
            "REVERT",
            "BlockSchema",
            blockSchema.ProjectId,
            blockSchema.PageId,
            blockSchemaId,
            oldContent,
            targetVersion.Content,
            JsonConvert.SerializeObject(new { targetVersion = versionNumber, reason })
        );

        _logger.LogInformation(
            "User {UserId} reverted BlockSchema {BlockSchemaId} to version {VersionNumber}",
            userId, blockSchemaId, versionNumber);

        return blockSchema;
    }
}
