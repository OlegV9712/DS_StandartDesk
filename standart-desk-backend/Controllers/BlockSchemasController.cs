using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlockSchemasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IVersioningService _versioningService;
    private readonly ILogger<BlockSchemasController> _logger;

    public BlockSchemasController(
        ApplicationDbContext context,
        IAuditService auditService,
        IVersioningService versioningService,
        ILogger<BlockSchemasController> logger)
    {
        _context = context;
        _auditService = auditService;
        _versioningService = versioningService;
        _logger = logger;
    }

    [HttpGet("page/{pageId}")]
    public async Task<ActionResult<List<BlockSchemaDto>>> GetBlockSchemasByPage(int pageId)
    {
        var schemas = await _context.BlockSchemas
            .Where(bs => bs.PageId == pageId)
            .ToListAsync();

        var result = schemas.Select(bs => new BlockSchemaDto
        {
            Id = bs.Id,
            ProjectId = bs.ProjectId,
            PageId = bs.PageId,
            Name = bs.Name,
            Content = bs.Content,
            Version = bs.Version,
            CreatedAt = bs.CreatedAt,
            UpdatedAt = bs.UpdatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BlockSchemaDto>> GetBlockSchema(int id)
    {
        var schema = await _context.BlockSchemas.FindAsync(id);
        if (schema == null)
            return NotFound();

        return Ok(new BlockSchemaDto
        {
            Id = schema.Id,
            ProjectId = schema.ProjectId,
            PageId = schema.PageId,
            Name = schema.Name,
            Content = schema.Content,
            Version = schema.Version,
            CreatedAt = schema.CreatedAt,
            UpdatedAt = schema.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<BlockSchemaDto>> CreateBlockSchema(
        [FromBody] CreateBlockSchemaDto dto,
        [FromQuery] int projectId,
        [FromQuery] int userId = 1)
    {
        var page = await _context.Pages.FindAsync(dto.PageId);
        if (page == null)
            return BadRequest("Page not found");

        var schema = new BlockSchema
        {
            ProjectId = projectId,
            PageId = dto.PageId,
            Name = dto.Name,
            Content = dto.Content,
            Version = 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.BlockSchemas.Add(schema);
        await _context.SaveChangesAsync();

        // Create initial version
        await _versioningService.CreateVersionAsync(schema.Id, userId, dto.Content, "Initial version");

        await _auditService.LogActionAsync(userId, "CREATE", "BlockSchema", projectId, dto.PageId, schema.Id, null, dto);

        _logger.LogInformation("BlockSchema {BlockSchemaId} created", schema.Id);

        return CreatedAtAction(nameof(GetBlockSchema), new { id = schema.Id }, new BlockSchemaDto
        {
            Id = schema.Id,
            ProjectId = schema.ProjectId,
            PageId = schema.PageId,
            Name = schema.Name,
            Content = schema.Content,
            Version = schema.Version,
            CreatedAt = schema.CreatedAt,
            UpdatedAt = schema.UpdatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBlockSchema(
        int id,
        [FromBody] UpdateBlockSchemaDto dto,
        [FromQuery] int userId = 1)
    {
        var logPrefix = $"[UPDATE_SCHEMA] Schema {id}";
        try
        {
            _logger.LogInformation($"{logPrefix} User {userId} attempting to update. Content length: {dto.Content?.Length ?? 0}");

            var schema = await _context.BlockSchemas.FindAsync(id);
            if (schema == null)
            {
                _logger.LogWarning($"{logPrefix} - Schema not found");
                return NotFound(new { message = "Block schema not found" });
            }

            var oldContent = schema.Content;
            schema.Name = dto.Name ?? schema.Name;
            schema.Content = dto.Content ?? string.Empty;
            schema.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation($"{logPrefix} - Updating content and creating version. Project: {schema.ProjectId}");

            var contentToSave = dto.Content ?? string.Empty;
            await _versioningService.CreateVersionAsync(id, userId, contentToSave, dto.ChangeDescription ?? "Updated via Canvas Editor");
            await _context.SaveChangesAsync();

            // Log audit action
            await _auditService.LogActionAsync(
                userId,
                "UPDATE_BLOCKSCHEMA",
                "BlockSchema",
                schema.ProjectId,
                schema.PageId,
                id,
                new { name = schema.Name, contentLength = oldContent?.Length },
                new { name = schema.Name, contentLength = contentToSave.Length },
                $"Block schema updated: {schema.Name}"
            );

            _logger.LogInformation($"{logPrefix} - Successfully saved. New UpdatedAt: {schema.UpdatedAt}");

            return Ok(new
            {
                message = "Block schema updated successfully",
                schema = new
                {
                    id = schema.Id,
                    name = schema.Name,
                    version = schema.Version,
                    updatedAt = schema.UpdatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error updating block schema", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBlockSchema(int id, [FromQuery] int userId = 1)
    {
        var schema = await _context.BlockSchemas.FindAsync(id);
        if (schema == null)
            return NotFound();

        var projectId = schema.ProjectId;
        var pageId = schema.PageId;

        _context.BlockSchemas.Remove(schema);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(userId, "DELETE", "BlockSchema", projectId, pageId, id, schema.Name, null);

        _logger.LogInformation("BlockSchema {BlockSchemaId} deleted", id);
        return NoContent();
    }

    [HttpGet("{id}/versions")]
    public async Task<ActionResult<List<BlockSchemaVersionDto>>> GetVersionHistory(int id)
    {
        var versions = await _versioningService.GetVersionHistoryAsync(id);

        var result = versions.Select(v => new BlockSchemaVersionDto
        {
            Id = v.Id,
            VersionNumber = v.VersionNumber,
            Content = v.Content,
            CreatedByUserName = v.CreatedByUser?.FullName ?? v.CreatedByUser?.Username ?? "Unknown",
            CreatedAt = v.CreatedAt,
            ChangeDescription = v.ChangeDescription
        }).ToList();

        return Ok(result);
    }

    [HttpPost("{id}/revert")]
    public async Task<IActionResult> RevertToVersion(int id, [FromBody] RevertChangeDto dto, [FromQuery] int userId = 1)
    {
        var schema = await _versioningService.RevertToVersionAsync(id, dto.VersionId, userId, dto.Reason);
        if (schema == null)
            return NotFound();

        _logger.LogInformation("BlockSchema {BlockSchemaId} reverted to version {VersionId} by user {UserId}", id, dto.VersionId, userId);
        return NoContent();
    }

    [HttpPost("{id}/build")]
    public async Task<IActionResult> BuildScenario(int id, [FromQuery] int userId = 1)
    {
        var schema = await _context.BlockSchemas.FindAsync(id);
        if (schema == null)
            return NotFound(new { message = "Block schema not found" });

        // Парсим для валидации
        try
        {
            if (string.IsNullOrEmpty(schema.Content))
                return BadRequest(new { message = "Invalid scenario JSON structure" });

            var content = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, object>>(schema.Content);
            if (content == null)
                return BadRequest(new { message = "Invalid scenario JSON structure" });

            _logger.LogInformation($"Building scenario {id} by user {userId}");

            // Сохраняем текущую версию перед обновлением (для undo)
            const string buildChangeDescription = "Built scenario";
            await _versioningService.CreateVersionAsync(
                id, 
                userId, 
                schema.Content, 
                buildChangeDescription
            );

            // Обновляем UpdatedAt при сборке
            schema.UpdatedAt = DateTime.UtcNow;
            _context.BlockSchemas.Update(schema);
            await _context.SaveChangesAsync();

            // Логируем как audit event
            await _auditService.LogActionAsync(
                userId,
                "BUILD_SCENARIO",
                "BlockSchema",
                schema.ProjectId,
                schema.PageId,
                id,
                null,
                new { message = "Scenario built and ready for testing", buildTime = DateTime.UtcNow },
                "Scenario compiled for testing"
            );

            _logger.LogInformation($"BlockSchema {id} successfully compiled by user {userId}");

            return Ok(new
            {
                message = "Scenario built successfully",
                schemaId = id,
                schemaName = schema.Name,
                buildTime = DateTime.UtcNow,
                readyForTesting = true
            });
        }
        catch (System.Text.Json.JsonException ex)
        {
            _logger.LogError($"Failed to build scenario {id}: Invalid JSON - {ex.Message}");
            return BadRequest(new
            {
                message = "Failed to build scenario",
                error = "Invalid JSON structure: " + ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to build scenario {id}: {ex.Message}");
            return BadRequest(new
            {
                message = "Failed to build scenario",
                error = ex.Message
            });
        }
    }
}
