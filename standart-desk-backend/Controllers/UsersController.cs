using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.Services;
using System.Security.Claims;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuditService _auditService;
    private readonly ISecurityService _securityService;

    public UsersController(
        ApplicationDbContext db,
        ILogger<UsersController> logger,
        IAuditService auditService,
        ISecurityService securityService)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
        _securityService = securityService;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserSettingsRequest request)
    {
        try
        {
            // Get current user ID from JWT claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized();
            }

            // Security: Users can only update their own profile, except admins
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (currentUserId != id && userRole != UserRole.Admin.ToString())
            {
                _logger.LogWarning("Unauthorized update attempt by user {UserId} for user {TargetId}", currentUserId, id);
                return Forbid("You can only update your own profile");
            }

            _logger.LogInformation("User {UserId} attempting to update user {TargetId}", currentUserId, id);

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found", id);
                return NotFound(new { message = "User not found" });
            }

            // Store old values for audit log
            var oldFullName = user.FullName;
            var oldAvatar = user.Avatar;
            var oldIsActive = user.IsActive;

            // Update user properties with validation and sanitization
            if (!string.IsNullOrEmpty(request.FullName))
            {
                var sanitized = _securityService.SanitizeInput(request.FullName);
                if (sanitized.Length > 255)
                {
                    return BadRequest(new { message = "Full name is too long (max 255 characters)" });
                }
                user.FullName = sanitized;
                _logger.LogInformation("User {UserId} updated fullName for user {TargetId}", currentUserId, id);
            }

            if (!string.IsNullOrEmpty(request.Avatar))
            {
                // Validate Avatar is a URL
                if (!_securityService.IsValidUrl(request.Avatar))
                {
                    return BadRequest(new { message = "Invalid avatar URL" });
                }
                user.Avatar = request.Avatar;
                _logger.LogInformation("User {UserId} updated avatar for user {TargetId}", currentUserId, id);
            }

            // Only admins can change user status
            if (!string.IsNullOrEmpty(request.Status))
            {
                if (userRole != UserRole.Admin.ToString())
                {
                    return Forbid("Only administrators can change user status");
                }

                var isActive = request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase);
                user.IsActive = isActive;
                _logger.LogInformation("User {UserId} updated status for user {TargetId}", currentUserId, id);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Log the action for audit
            await _auditService.LogActionAsync(
                currentUserId,
                "UPDATE_SETTINGS",
                "User",
                null, null, null,
                new { fullName = oldFullName, avatar = oldAvatar, isActive = oldIsActive },
                new { fullName = user.FullName, avatar = user.Avatar, isActive = user.IsActive },
                $"Updated user {id} settings"
            );

            _logger.LogInformation("User {UserId} successfully updated settings for user {TargetId}", currentUserId, id);

            return Ok(new
            {
                message = "Settings updated successfully",
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    avatar = user.Avatar,
                    isActive = user.IsActive,
                    role = user.Role.ToString(),
                    createdAt = user.CreatedAt,
                    lastLoginAt = user.LastLoginAt,
                    updatedAt = user.UpdatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId} settings", id);
            return StatusCode(500, new { message = "Error updating settings" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized();
            }

            _logger.LogInformation("User {UserId} fetching user {TargetId}", currentUserId, id);

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null)
            {
                _logger.LogWarning("User {TargetId} not found", id);
                return NotFound(new { message = "User not found" });
            }

            // Users can see their own full profile, others see limited info
            if (currentUserId == id)
            {
                return Ok(new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    avatar = user.Avatar,
                    isActive = user.IsActive,
                    role = user.Role.ToString(),
                    createdAt = user.CreatedAt,
                    lastLoginAt = user.LastLoginAt,
                    updatedAt = user.UpdatedAt
                });
            }
            else
            {
                // Limited public profile
                return Ok(new
                {
                    id = user.Id,
                    username = user.Username,
                    fullName = user.FullName,
                    avatar = user.Avatar
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user {UserId}", id);
            return StatusCode(500, new { message = "Error retrieving user" });
        }
    }
}

public class UpdateUserSettingsRequest
{
    public string? FullName { get; set; }
    public string? Avatar { get; set; }
    public string? Status { get; set; } // "Active" or "Inactive"
}
