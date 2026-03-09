using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaskDomainController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<TaskDomainController> _logger;
    private readonly IAuditService _auditService;

    public TaskDomainController(ApplicationDbContext db, ILogger<TaskDomainController> logger, IAuditService auditService)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim?.Value, out var userId) ? userId : 0;
    }

    private bool IsAdmin()
    {
        var roleClaim = User.FindFirst(ClaimTypes.Role);
        return roleClaim?.Value == UserRole.Admin.ToString();
    }

    // Get all task domains
    [HttpGet]
    public async Task<IActionResult> GetAllTaskDomains()
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[GET_DOMAINS] User {userId}";

        try
        {
            _logger.LogInformation($"{logPrefix} - Fetching task domains");

            var domains = await _db.TaskDomains
                .Where(d => d.IsActive)
                .Include(d => d.CreatedByUser)
                .Select(d => new TaskDomainDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Description = d.Description,
                    Color = d.Color,
                    Icon = d.Icon,
                    CreatedByUserId = d.CreatedByUserId,
                    CreatedByUserName = d.CreatedByUser!.Username,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    IsActive = d.IsActive,
                    TaskCount = d.Tasks.Count
                })
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return Ok(domains);
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error retrieving task domains" });
        }
    }

    // Get accessible task domains for current user
    [HttpGet("accessible")]
    public async Task<IActionResult> GetAccessibleTaskDomains()
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[GET_ACCESSIBLE_DOMAINS] User {userId}";

        try
        {
            _logger.LogInformation($"{logPrefix} - Fetching accessible task domains");

            // Admins can see all domains, others see only accessible ones
            var query = _db.TaskDomains.Where(d => d.IsActive);

            if (!IsAdmin())
            {
                query = query.Where(d => 
                    d.DomainAccess.Any(da => da.UserId == userId && da.CanView)
                );
            }

            var domains = await query
                .Include(d => d.CreatedByUser)
                .Select(d => new TaskDomainDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Description = d.Description,
                    Color = d.Color,
                    Icon = d.Icon,
                    CreatedByUserId = d.CreatedByUserId,
                    CreatedByUserName = d.CreatedByUser!.Username,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    IsActive = d.IsActive,
                    TaskCount = d.Tasks.Count
                })
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return Ok(domains);
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error retrieving accessible task domains" });
        }
    }

    // Get task domain by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTaskDomain(int id)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[GET_DOMAIN] User {userId} Domain {id}";

        try
        {
            var domain = await _db.TaskDomains
                .Include(d => d.CreatedByUser)
                .Include(d => d.DomainAccess)
                    .ThenInclude(da => da.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (domain == null)
            {
                return NotFound(new { message = "Task domain not found" });
            }

            // Check access
            if (!IsAdmin() && !domain.DomainAccess.Any(da => da.UserId == userId && da.CanView))
            {
                return Forbid();
            }

            var accessList = domain.DomainAccess
                .Select(da => new TaskDomainAccessDto
                {
                    Id = da.Id,
                    UserId = da.UserId,
                    Username = da.User!.Username,
                    FullName = da.User!.FullName,
                    Avatar = da.User!.Avatar,
                    CanView = da.CanView,
                    CanEdit = da.CanEdit,
                    CanDelete = da.CanDelete,
                    IsManager = da.IsManager,
                    GrantedAt = da.GrantedAt
                })
                .ToList();

            var detail = new TaskDomainDetailDto
            {
                Id = domain.Id,
                Name = domain.Name,
                Description = domain.Description,
                Color = domain.Color,
                Icon = domain.Icon,
                CreatedByUserId = domain.CreatedByUserId,
                CreatedByUserName = domain.CreatedByUser!.Username,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt,
                IsActive = domain.IsActive,
                AccessList = accessList
            };

            return Ok(detail);
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error retrieving task domain" });
        }
    }

    // Create task domain (Admin only)
    [HttpPost]
    public async Task<IActionResult> CreateTaskDomain([FromBody] CreateTaskDomainDto request)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[CREATE_DOMAIN] User {userId}";

        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Task domain name is required" });
            }

            // Check if domain with same name already exists
            if (await _db.TaskDomains.AnyAsync(d => d.Name == request.Name))
            {
                return BadRequest(new { message = "Task domain with this name already exists" });
            }

            var domain = new TaskDomain
            {
                Name = request.Name.Trim(),
                Description = request.Description,
                Color = request.Color ?? "#007BFF",
                Icon = request.Icon,
                CreatedByUserId = userId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.TaskDomains.Add(domain);
            await _db.SaveChangesAsync();

            // Grant creator full access with manager rights
            var creatorAccess = new TaskDomainAccess
            {
                TaskDomainId = domain.Id,
                UserId = userId,
                CanView = true,
                CanEdit = true,
                CanDelete = true,
                IsManager = true,
                GrantedAt = DateTime.UtcNow
            };

            _db.TaskDomainAccess.Add(creatorAccess);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - Task domain '{domain.Name}' created successfully");

            // Audit log
            await _auditService.LogActionAsync(
                userId,
                "CREATE_TASK_DOMAIN",
                "TaskDomain",
                null, null, null,
                null,
                new { name = domain.Name, description = domain.Description },
                $"Admin created new task domain '{domain.Name}'"
            );

            return Created($"/api/taskdomain/{domain.Id}", new
            {
                message = "Task domain created successfully",
                domainId = domain.Id,
                domain = new TaskDomainDto
                {
                    Id = domain.Id,
                    Name = domain.Name,
                    Description = domain.Description,
                    Color = domain.Color,
                    Icon = domain.Icon,
                    CreatedByUserId = domain.CreatedByUserId,
                    CreatedAt = domain.CreatedAt,
                    IsActive = domain.IsActive,
                    TaskCount = 0
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error creating task domain" });
        }
    }

    // Update task domain (Admin or Domain Manager)
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTaskDomain(int id, [FromBody] UpdateTaskDomainDto request)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[UPDATE_DOMAIN] User {userId} Domain {id}";

        try
        {
            var domain = await _db.TaskDomains.FindAsync(id);
            if (domain == null)
            {
                return NotFound(new { message = "Task domain not found" });
            }

            // Check permissions
            if (!IsAdmin())
            {
                var access = await _db.TaskDomainAccess
                    .FirstOrDefaultAsync(da => da.TaskDomainId == id && da.UserId == userId && da.IsManager);

                if (access == null)
                {
                    return Forbid();
                }
            }

            // Store old values for audit
            var oldName = domain.Name;
            var oldDescription = domain.Description;

            if (!string.IsNullOrEmpty(request.Name))
                domain.Name = request.Name.Trim();

            if (request.Description != null)
                domain.Description = request.Description;

            if (!string.IsNullOrEmpty(request.Color))
                domain.Color = request.Color;

            if (!string.IsNullOrEmpty(request.Icon))
                domain.Icon = request.Icon;

            if (request.IsActive.HasValue)
                domain.IsActive = request.IsActive.Value;

            domain.UpdatedAt = DateTime.UtcNow;

            _db.TaskDomains.Update(domain);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - Task domain updated successfully");

            // Audit log
            await _auditService.LogActionAsync(
                userId,
                "UPDATE_TASK_DOMAIN",
                "TaskDomain",
                id, null, null,
                new { name = oldName, description = oldDescription },
                new { name = domain.Name, description = domain.Description },
                $"Task domain '{domain.Name}' updated"
            );

            return Ok(new { message = "Task domain updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error updating task domain" });
        }
    }

    // Delete task domain (Admin only)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTaskDomain(int id)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[DELETE_DOMAIN] User {userId} Domain {id}";

        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            var domain = await _db.TaskDomains
                .Include(d => d.Tasks)
                .Include(d => d.DomainAccess)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (domain == null)
            {
                return NotFound(new { message = "Task domain not found" });
            }

            // If domain has tasks, deactivate instead of delete
            if (domain.Tasks.Any())
            {
                domain.IsActive = false;
                domain.UpdatedAt = DateTime.UtcNow;
                _db.TaskDomains.Update(domain);
            }
            else
            {
                _db.TaskDomainAccess.RemoveRange(domain.DomainAccess);
                _db.TaskDomains.Remove(domain);
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - Task domain deleted/deactivated successfully");

            // Audit log
            await _auditService.LogActionAsync(
                userId,
                "DELETE_TASK_DOMAIN",
                "TaskDomain",
                id, null, null,
                new { name = domain.Name },
                null,
                $"Task domain '{domain.Name}' deleted"
            );

            return Ok(new { message = "Task domain deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error deleting task domain" });
        }
    }

    // Grant access to task domain
    [HttpPost("{domainId}/access")]
    public async Task<IActionResult> GrantTaskDomainAccess(int domainId, [FromBody] UpdateTaskDomainAccessDto request)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[GRANT_ACCESS] User {userId} Domain {domainId} To User {request.UserId}";

        try
        {
            var domain = await _db.TaskDomains.FindAsync(domainId);
            if (domain == null)
            {
                return NotFound(new { message = "Task domain not found" });
            }

            // Check if current user is admin or manager
            if (!IsAdmin())
            {
                var access = await _db.TaskDomainAccess
                    .FirstOrDefaultAsync(da => da.TaskDomainId == domainId && da.UserId == userId && da.IsManager);

                if (access == null)
                {
                    return Forbid();
                }
            }

            // Check if target user exists
            var targetUser = await _db.Users.FindAsync(request.UserId);
            if (targetUser == null)
            {
                return BadRequest(new { message = "Target user not found" });
            }

            // Check if access already exists
            var existingAccess = await _db.TaskDomainAccess
                .FirstOrDefaultAsync(da => da.TaskDomainId == domainId && da.UserId == request.UserId);

            if (existingAccess != null)
            {
                // Update existing access
                existingAccess.CanView = request.CanView;
                existingAccess.CanEdit = request.CanEdit;
                existingAccess.CanDelete = request.CanDelete;
                existingAccess.IsManager = request.IsManager;
                existingAccess.UpdatedAt = DateTime.UtcNow;

                _db.TaskDomainAccess.Update(existingAccess);
            }
            else
            {
                // Create new access
                var newAccess = new TaskDomainAccess
                {
                    TaskDomainId = domainId,
                    UserId = request.UserId,
                    CanView = request.CanView,
                    CanEdit = request.CanEdit,
                    CanDelete = request.CanDelete,
                    IsManager = request.IsManager,
                    GrantedAt = DateTime.UtcNow
                };

                _db.TaskDomainAccess.Add(newAccess);
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - Access granted/updated successfully");

            // Audit log
            await _auditService.LogActionAsync(
                userId,
                "GRANT_DOMAIN_ACCESS",
                "TaskDomainAccess",
                null, domainId, request.UserId,
                null,
                new { canView = request.CanView, canEdit = request.CanEdit, canDelete = request.CanDelete, isManager = request.IsManager },
                $"Access granted to user {request.UserId} for domain {domainId}"
            );

            return Ok(new { message = "Access granted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error granting access" });
        }
    }

    // Revoke access from task domain
    [HttpDelete("{domainId}/access/{accessId}")]
    public async Task<IActionResult> RevokeTaskDomainAccess(int domainId, int accessId)
    {
        var userId = GetCurrentUserId();
        var logPrefix = $"[REVOKE_ACCESS] User {userId} Domain {domainId} Access {accessId}";

        try
        {
            // Check if current user is admin or manager
            if (!IsAdmin())
            {
                var access = await _db.TaskDomainAccess
                    .FirstOrDefaultAsync(da => da.TaskDomainId == domainId && da.UserId == userId && da.IsManager);

                if (access == null)
                {
                    return Forbid();
                }
            }

            var accessToRevoke = await _db.TaskDomainAccess.FindAsync(accessId);
            if (accessToRevoke == null)
            {
                return NotFound(new { message = "Access record not found" });
            }

            var targetUserId = accessToRevoke.UserId;

            _db.TaskDomainAccess.Remove(accessToRevoke);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - Access revoked successfully");

            // Audit log
            await _auditService.LogActionAsync(
                userId,
                "REVOKE_DOMAIN_ACCESS",
                "TaskDomainAccess",
                null, domainId, targetUserId,
                null,
                null,
                $"Access revoked from user {targetUserId} for domain {domainId}"
            );

            return Ok(new { message = "Access revoked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error revoking access" });
        }
    }
}
