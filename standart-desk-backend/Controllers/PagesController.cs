using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<PagesController> _logger;

    public PagesController(ApplicationDbContext context, IAuditService auditService, ILogger<PagesController> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }

    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<List<PageDto>>> GetPagesByProject(int projectId)
    {
        var pages = await _context.Pages
            .Where(p => p.ProjectId == projectId)
            .OrderBy(p => p.Order)
            .ToListAsync();

        var result = pages.Select(p => new PageDto
        {
            Id = p.Id,
            ProjectId = p.ProjectId,
            Name = p.Name,
            Order = p.Order,
            Thumbnail = p.Thumbnail
        }).ToList();

        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<List<PageDto>>> GetPages([FromQuery] int projectId)
    {
        var pages = await _context.Pages
            .Where(p => p.ProjectId == projectId)
            .OrderBy(p => p.Order)
            .ToListAsync();

        var result = pages.Select(p => new PageDto
        {
            Id = p.Id,
            ProjectId = p.ProjectId,
            Name = p.Name,
            Order = p.Order,
            Thumbnail = p.Thumbnail
        }).ToList();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<PageDto>> CreatePage([FromBody] CreatePageDto dto, [FromQuery] int projectId, [FromQuery] int userId = 1)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project == null)
            return BadRequest("Project not found");

        var page = new Page
        {
            ProjectId = projectId,
            Name = dto.Name,
            Order = dto.Order,
            CreatedAt = DateTime.UtcNow
        };

        _context.Pages.Add(page);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(userId, "CREATE", "Page", projectId, page.Id, null, null, dto);

        _logger.LogInformation("Page {PageId} created in project {ProjectId}", page.Id, projectId);

        return CreatedAtAction(nameof(GetPagesByProject), new { projectId }, new PageDto
        {
            Id = page.Id,
            ProjectId = page.ProjectId,
            Name = page.Name,
            Order = page.Order,
            Thumbnail = page.Thumbnail
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePage(int id, [FromBody] UpdatePageDto dto, [FromQuery] int userId = 1)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null)
            return NotFound();

        var oldData = new { page.Name, page.Order };
        page.Name = dto.Name;
        page.Order = dto.Order;
        page.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogActionAsync(userId, "UPDATE", "Page", page.ProjectId, id, null, oldData, dto);

        _logger.LogInformation("Page {PageId} updated", id);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderPages([FromBody] ReorderPagesDto dto, [FromQuery] int projectId, [FromQuery] int userId = 1)
    {
        var pages = await _context.Pages
            .Where(p => p.ProjectId == projectId && dto.Pages.Select(x => x.PageId).Contains(p.Id))
            .ToListAsync();

        foreach (var pageOrder in dto.Pages)
        {
            var page = pages.FirstOrDefault(p => p.Id == pageOrder.PageId);
            if (page != null)
            {
                page.Order = pageOrder.Order;
                page.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        await _auditService.LogActionAsync(userId, "REORDER", "Pages", projectId, null, null, null, dto);

        _logger.LogInformation("Pages reordered in project {ProjectId}", projectId);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePage(int id, [FromQuery] int userId = 1)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null)
            return NotFound();

        var projectId = page.ProjectId;
        _context.Pages.Remove(page);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(userId, "DELETE", "Page", projectId, id, null, page.Name, null);

        _logger.LogInformation("Page {PageId} deleted", id);
        return NoContent();
    }
}
