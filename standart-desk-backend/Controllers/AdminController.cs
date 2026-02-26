using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AdminController> _logger;
    private readonly IAuditService _auditService;

    public AdminController(ApplicationDbContext db, ILogger<AdminController> logger, IAuditService auditService)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
    }

    // Get all users (Admin only)
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var adminId = GetCurrentUserId();
        var logPrefix = $"[GET_ALL_USERS] Admin {adminId}";

        try
        {
            _logger.LogInformation($"{logPrefix} - Attempting to fetch all users");

            if (!IsAdmin())
            {
                _logger.LogWarning($"{logPrefix} - Forbidden (not admin)");
                return Forbid();
            }

            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Avatar,
                    Role = u.Role.ToString(),
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt
                })
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            _logger.LogInformation($"{logPrefix} - Successfully retrieved {users.Count} users");

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error retrieving users" });
        }
    }

    // Create user (Admin only)
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var adminId = GetCurrentUserId();
        var logPrefix = $"[CREATE_USER] Admin {adminId}";

        try
        {
            _logger.LogInformation($"{logPrefix} attempting to create user: {request.Username}");

            if (!IsAdmin())
            {
                _logger.LogWarning($"{logPrefix} - Forbidden (not admin)");
                return Forbid();
            }

            // Validate request
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                _logger.LogWarning($"{logPrefix} - Username is empty");
                return BadRequest(new { message = "Username is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                _logger.LogWarning($"{logPrefix} - Email is empty");
                return BadRequest(new { message = "Email is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                _logger.LogWarning($"{logPrefix} - Password is empty");
                return BadRequest(new { message = "Password is required" });
            }

            // Check for duplicates
            if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            {
                _logger.LogWarning($"{logPrefix} - Username '{request.Username}' already exists");
                return BadRequest(new { message = "Username already exists" });
            }

            if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            {
                _logger.LogWarning($"{logPrefix} - Email '{request.Email}' already exists");
                return BadRequest(new { message = "Email already exists" });
            }

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                FullName = request.FullName ?? request.Username,
                PasswordHash = HashPassword(request.Password),
                Role = (UserRole)request.Role,
                IsActive = request.IsActive,
                Avatar = "👤",
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"{logPrefix} - User created successfully in database. UserId: {user.Id}");

            // Log the action
            await _auditService.LogActionAsync(
                adminId,
                "CREATE_USER",
                "User",
                null, null, null,
                null,
                new { username = user.Username, email = user.Email, role = user.Role.ToString(), isActive = user.IsActive },
                $"Admin created new user '{user.Username}' with role {user.Role}"
            );

            _logger.LogInformation($"{logPrefix} - Audit log recorded for user {user.Id}");

            return Ok(new
            {
                message = "User created successfully",
                userId = user.Id,
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    role = user.Role.ToString(),
                    isActive = user.IsActive,
                    createdAt = user.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"{logPrefix} - EXCEPTION: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "Error creating user", error = ex.Message });
        }
    }

    // Update user (Admin only)
    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Store old values for audit log
            var oldEmail = user.Email;
            var oldFullName = user.FullName;
            var oldRole = user.Role;
            var oldIsActive = user.IsActive;

            if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
            {
                if (await _db.Users.AnyAsync(u => u.Email == request.Email))
                {
                    return BadRequest(new { message = "Email already exists" });
                }
                user.Email = request.Email;
            }

            if (!string.IsNullOrEmpty(request.FullName))
            {
                user.FullName = request.FullName;
            }

            if (request.Role.HasValue)
            {
                user.Role = (UserRole)request.Role;
            }

            if (request.IsActive.HasValue)
            {
                user.IsActive = request.IsActive.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Log the action with old and new values
            await _auditService.LogActionAsync(
                GetCurrentUserId(),
                "UPDATE",
                "User",
                null, null, null,
                new { email = oldEmail, fullName = oldFullName, role = oldRole, isActive = oldIsActive },
                new { email = user.Email, fullName = user.FullName, role = user.Role, isActive = user.IsActive },
                $"User {user.Username} updated"
            );

            _logger.LogInformation($"Admin {GetCurrentUserId()} updated user: {user.Username}");

            return Ok(new { message = "User updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating user: {ex.Message}");
            return StatusCode(500, new { message = "Error updating user" });
        }
    }

    // Delete user (Admin only)
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (user.Id == GetCurrentUserId())
            {
                return BadRequest(new { message = "Cannot delete your own account" });
            }

            var deletedUserInfo = new { username = user.Username, email = user.Email, role = user.Role };

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            // Log the action
            await _auditService.LogActionAsync(
                GetCurrentUserId(),
                "DELETE",
                "User",
                null, null, null,
                deletedUserInfo,
                null,
                $"User {user.Username} deleted"
            );

            _logger.LogInformation($"Admin {GetCurrentUserId()} deleted user: {user.Username}");

            return Ok(new { message = "User deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting user: {ex.Message}");
            return StatusCode(500, new { message = "Error deleting user" });
        }
    }

    // Get audit logs (Admin only)
    [HttpGet("logs")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            var logs = await _db.AuditLogs
                .Include(l => l.User)
                .Include(l => l.Project)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.EntityType,
                    User = l.User != null ? new { l.User.Username, l.User.Email } : null,
                    Project = l.Project != null ? new { l.Project.Name } : null,
                    l.CreatedAt,
                    l.OldValue,
                    l.NewValue
                })
                .ToListAsync();

            var total = await _db.AuditLogs.CountAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                items = logs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting audit logs: {ex.Message}");
            return StatusCode(500, new { message = "Error retrieving logs" });
        }
    }

    // Get dashboard stats (Admin only)
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            if (!IsAdmin())
            {
                return Forbid();
            }

            var stats = new
            {
                totalUsers = await _db.Users.CountAsync(),
                totalProjects = await _db.Projects.CountAsync(),
                totalPages = await _db.Pages.CountAsync(),
                totalBlockSchemas = await _db.BlockSchemas.CountAsync(),
                totalAuditLogs = await _db.AuditLogs.CountAsync(),
                activeUsers = await _db.Users.CountAsync(u => u.IsActive),
                lastLoginUsers = await _db.Users
                    .Where(u => u.LastLoginAt != null)
                    .OrderByDescending(u => u.LastLoginAt)
                    .Take(5)
                    .Select(u => new { u.Username, u.LastLoginAt })
                    .ToListAsync()
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting stats: {ex.Message}");
            return StatusCode(500, new { message = "Error retrieving statistics" });
        }
    }

    private string HashPassword(string password)
    {
        using (var sha256 = SHA256.Create())
        {
            var salt = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }

            var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(20);

            var hashBytes = new byte[36];
            Array.Copy(salt, 0, hashBytes, 0, 16);
            Array.Copy(hash, 0, hashBytes, 16, 20);

            return Convert.ToBase64String(hashBytes);
        }
    }

    private bool IsAdmin()
    {
        var roleClaim = User.FindFirst(ClaimTypes.Role);
        return roleClaim?.Value == UserRole.Admin.ToString();
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("userId");
        return int.TryParse(userIdClaim?.Value, out var id) ? id : 0;
    }
}

public class CreateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int Role { get; set; } = (int)UserRole.User;
    public bool IsActive { get; set; } = true;
}

public class UpdateUserRequest
{
    public string? Email { get; set; }
    public string? FullName { get; set; }
    public int? Role { get; set; }
    public bool? IsActive { get; set; }
}
