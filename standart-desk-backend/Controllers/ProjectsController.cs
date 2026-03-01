using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(ApplicationDbContext context, IAuditService auditService, ILogger<ProjectsController> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetProjects([FromQuery] int userId = 1)
    {
        var projects = await _context.Projects
            .Where(p => p.OwnerId == userId && !p.IsArchived)
            .Include(p => p.Owner)
            .Include(p => p.Pages.OrderBy(pg => pg.Order))
            .ToListAsync();

        var result = projects.Select(p => new ProjectDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            OwnerName = p.Owner?.FullName ?? p.Owner?.Username ?? "Unknown",
            Type = (int)p.Type,
            FolderId = p.FolderId,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            IsArchived = p.IsArchived,
            CurrentOpenByUserName = p.CurrentOpenByUserId.HasValue
                ? _context.Users.FirstOrDefault(u => u.Id == p.CurrentOpenByUserId)?.FullName ?? "Unknown"
                : null,
            Pages = p.Pages.Select(pg => new PageDto
            {
                Id = pg.Id,
                ProjectId = pg.ProjectId,
                Name = pg.Name,
                Order = pg.Order,
                Thumbnail = pg.Thumbnail
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(int id)
    {
        var project = await _context.Projects
            .Include(p => p.Owner)
            .Include(p => p.Pages.OrderBy(pg => pg.Order))
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
            return NotFound();

        var result = new ProjectDto
        {
            Id = project.Id,
            Name = project.Name,
            Type = (int)project.Type,
            FolderId = project.FolderId,
            Description = project.Description,
            OwnerName = project.Owner?.FullName ?? project.Owner?.Username ?? "Unknown",
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            IsArchived = project.IsArchived,
            CurrentOpenByUserName = project.CurrentOpenByUserId.HasValue
                ? _context.Users.FirstOrDefault(u => u.Id == project.CurrentOpenByUserId)?.FullName ?? "Unknown"
                : null,
            Pages = project.Pages.Select(pg => new PageDto
            {
                Id = pg.Id,
                ProjectId = pg.ProjectId,
                Name = pg.Name,
                Order = pg.Order,
                Thumbnail = pg.Thumbnail
            }).ToList()
        };

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject([FromBody] CreateProjectDto dto, [FromQuery] int userId = 1)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return BadRequest("User not found");

        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description,
            OwnerId = userId,
            Type = (ProjectType)dto.Type,
            FolderId = dto.FolderId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(userId, "CREATE", "Project", project.Id, null, null, null, dto);

        _logger.LogInformation("Project {ProjectId} created by user {UserId}", project.Id, userId);

        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, new ProjectDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            OwnerName = user.FullName ?? user.Username,
            Type = (int)project.Type,
            FolderId = project.FolderId,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            IsArchived = project.IsArchived,
            Pages = new List<PageDto>()
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectDto dto, [FromQuery] int userId = 1)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
            return NotFound();

        var oldData = new { project.Name, project.Description };
        project.Name = dto.Name;
        project.Description = dto.Description;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogActionAsync(userId, "UPDATE", "Project", id, null, null, oldData, dto);

        _logger.LogInformation("Project {ProjectId} updated", id);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id, [FromQuery] int userId = 1)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
            return NotFound();

        project.IsArchived = true;
        project.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(userId, "DELETE", "Project", id, null, null, project.Name, null);

        _logger.LogInformation("Project {ProjectId} archived by user {UserId}", id, userId);
        return NoContent();
    }
}
