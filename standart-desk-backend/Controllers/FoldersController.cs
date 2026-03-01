using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoldersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<FoldersController> _logger;

    public FoldersController(ApplicationDbContext context, ILogger<FoldersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<FolderDto>>> GetFolders([FromQuery] int userId = 1)
    {
        var folders = await _context.Folders
            .Where(f => f.OwnerId == userId && f.ParentFolderId == null)
            .Include(f => f.SubFolders)
            .Include(f => f.Projects)
            .ToListAsync();

        var result = folders.Select(f => MapFolderToDto(f)).ToList();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FolderDto>> GetFolder(int id)
    {
        var folder = await _context.Folders
            .Include(f => f.SubFolders)
            .Include(f => f.Projects)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (folder == null)
            return NotFound();

        return Ok(MapFolderToDto(folder));
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> CreateFolder([FromBody] CreateFolderDto dto, [FromQuery] int userId = 1)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return BadRequest("User not found");

        var folder = new Folder
        {
            Name = dto.Name,
            OwnerId = userId,
            ParentFolderId = dto.ParentFolderId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Folders.Add(folder);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Folder {FolderId} created by user {UserId}", folder.Id, userId);

        return CreatedAtAction(nameof(GetFolder), new { id = folder.Id }, MapFolderToDto(folder));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFolder(int id, [FromBody] UpdateFolderDto dto)
    {
        var folder = await _context.Folders.FindAsync(id);
        if (folder == null)
            return NotFound();

        folder.Name = dto.Name;
        folder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Folder {FolderId} updated", id);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFolder(int id, [FromQuery] int userId = 1)
    {
        var folder = await _context.Folders.FindAsync(id);
        if (folder == null)
            return NotFound();

        // Delete all subfolders and projects recursively
        await DeleteFolderRecursive(folder);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Folder {FolderId} and all contents deleted by user {UserId}", id, userId);
        return NoContent();
    }

    [HttpPost("move")]
    public async Task<IActionResult> MoveProject([FromBody] MoveProjectDto dto, [FromQuery] int userId = 1)
    {
        var project = await _context.Projects.FindAsync(dto.ProjectId);
        if (project == null)
            return NotFound("Project not found");

        if (project.OwnerId != userId)
            return Forbid();

        project.FolderId = dto.TargetFolderId;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Project {ProjectId} moved to folder {FolderId}", dto.ProjectId, dto.TargetFolderId);
        return NoContent();
    }

    private FolderDto MapFolderToDto(Folder folder)
    {
        return new FolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            OwnerId = folder.OwnerId,
            ParentFolderId = folder.ParentFolderId,
            CreatedAt = folder.CreatedAt,
            UpdatedAt = folder.UpdatedAt,
            SubFolders = folder.SubFolders?.Select(sf => MapFolderToDto(sf)).ToList() ?? new List<FolderDto>(),
            Projects = folder.Projects?.Select(p => new ProjectDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                OwnerName = p.Owner?.FullName ?? p.Owner?.Username ?? "Unknown",
                Type = (int)p.Type,
                FolderId = p.FolderId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                IsArchived = p.IsArchived
            }).ToList() ?? new List<ProjectDto>()
        };
    }

    private async Task DeleteFolderRecursive(Folder folder)
    {
        // Get all subfolders and delete recursively
        var subfolders = await _context.Folders.Where(f => f.ParentFolderId == folder.Id).ToListAsync();
        foreach (var subfolder in subfolders)
        {
            await DeleteFolderRecursive(subfolder);
        }

        // Move projects to null (unfoldered) or delete them
        var projects = await _context.Projects.Where(p => p.FolderId == folder.Id).ToListAsync();
        foreach (var project in projects)
        {
            project.FolderId = null;
        }

        _context.Folders.Remove(folder);
    }
}
