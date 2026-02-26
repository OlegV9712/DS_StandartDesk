using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AuthController> _logger;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;

    public AuthController(ApplicationDbContext db, ILogger<AuthController> logger, IAuditService auditService, IConfiguration configuration)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
            {
                _logger.LogWarning($"Failed login attempt for user: {request.Username}");
                
                // Log failed attempt
                await _auditService.LogActionAsync(
                    0,
                    "FAILED_LOGIN",
                    "User",
                    null, null, null,
                    null,
                    new { username = request.Username },
                    "Failed login attempt"
                );
                
                return Unauthorized(new { message = "Invalid username or password" });
            }

            if (!user.IsActive)
            {
                _logger.LogWarning($"Login attempt for inactive user: {request.Username}");
                
                // Log attempt for inactive user
                await _auditService.LogActionAsync(
                    user.Id,
                    "LOGIN_INACTIVE",
                    "User",
                    null, null, null,
                    null,
                    new { username = user.Username },
                    "Attempt to login with inactive account"
                );
                
                return Unauthorized(new { message = "User account is inactive" });
            }

            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Log the action
            await _auditService.LogActionAsync(
                user.Id,
                "LOGIN",
                "User",
                null, null, null,
                null,
                new { username = user.Username, email = user.Email, role = user.Role },
                "User logged in"
            );

            _logger.LogInformation($"User logged in: {user.Username}");

            return Ok(new LoginResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = GenerateToken(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Login error: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            {
                return BadRequest(new { message = "Username already exists" });
            }

            if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                FullName = request.FullName,
                PasswordHash = HashPassword(request.Password),
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            // Log the action
            await _auditService.LogActionAsync(
                user.Id,
                "REGISTER",
                "User",
                null, null, null,
                null,
                new { username = user.Username, email = user.Email, role = user.Role },
                "New user registered"
            );

            _logger.LogInformation($"New user registered: {user.Username}");

            return Ok(new { message = "User registered successfully", userId = user.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Registration error: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }

    [HttpGet("verify")]
    public async Task<IActionResult> VerifyToken()
    {
        try
        {
            var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized();
            }

            // In production, validate JWT token properly
            // For now, we'll just check if it's a valid format
            var userId = int.Parse(token.Split('-')[0]);
            var user = await _db.Users.FindAsync(userId);

            if (user == null || !user.IsActive)
            {
                return Unauthorized();
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                role = user.Role.ToString()
            });
        }
        catch
        {
            return Unauthorized();
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

    private bool VerifyPassword(string password, string hash)
    {
        var hashBytes = Convert.FromBase64String(hash);
        var salt = new byte[16];
        Array.Copy(hashBytes, 0, salt, 0, 16);

        var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
        var hash2 = pbkdf2.GetBytes(20);

        for (int i = 0; i < 20; i++)
        {
            if (hashBytes[i + 16] != hash2[i])
                return false;
        }
        return true;
    }

    private string GenerateToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "your-secret-key-change-in-production-very-long-secret-key-here";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "StandartDesk";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "StandartDeskUsers";
        var jwtExpireDays = int.TryParse(_configuration["Jwt:ExpireDays"], out var days) ? days : 7;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("userId", user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("fullName", user.FullName ?? ""),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(jwtExpireDays),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
}

public class LoginResponse
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}
