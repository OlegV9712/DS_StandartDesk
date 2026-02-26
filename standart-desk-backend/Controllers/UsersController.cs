using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuditService _auditService;

    public UsersController(ApplicationDbContext db, ILogger<UsersController> logger, IAuditService auditService)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserSettingsRequest request)
    {
        try
        {
            _logger.LogInformation($"[SETTINGS] User {id} attempting to update profile settings");

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                _logger.LogWarning($"[SETTINGS] User {id} not found");
                return NotFound(new { message = "User not found" });
            }

            // Store old values for audit log
            var oldFullName = user.FullName;
            var oldAvatar = user.Avatar;
            var oldIsActive = user.IsActive;

            // Update user properties
            if (!string.IsNullOrEmpty(request.FullName))
            {
                user.FullName = request.FullName;
                _logger.LogInformation($"[SETTINGS] User {id} updated fullName: {oldFullName} -> {request.FullName}");
            }

            if (!string.IsNullOrEmpty(request.Avatar))
            {
                user.Avatar = request.Avatar;
                _logger.LogInformation($"[SETTINGS] User {id} updated avatar: {oldAvatar} -> {request.Avatar}");
            }

            if (!string.IsNullOrEmpty(request.Status))
            {
                var isActive = request.Status == "Active";
                user.IsActive = isActive;
                _logger.LogInformation($"[SETTINGS] User {id} updated status: {oldIsActive} -> {isActive}");
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Log the action
            await _auditService.LogActionAsync(
                id,
                "UPDATE_SETTINGS",
                "User",
                null, null, null,
                new { fullName = oldFullName, avatar = oldAvatar, isActive = oldIsActive },
                new { fullName = user.FullName, avatar = user.Avatar, isActive = user.IsActive },
                "User updated profile settings"
            );

            _logger.LogInformation($"[SETTINGS] User {id} successfully updated settings");

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
            _logger.LogError($"[SETTINGS] Error updating user {id} settings: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error updating settings", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        try
        {
            _logger.LogInformation($"[USER_GET] Fetching user {id}");

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                _logger.LogWarning($"[USER_GET] User {id} not found");
                return NotFound(new { message = "User not found" });
            }

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
        catch (Exception ex)
        {
            _logger.LogError($"[USER_GET] Error fetching user {id}: {ex.Message}");
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
