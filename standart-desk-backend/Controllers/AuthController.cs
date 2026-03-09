using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
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
    private readonly ISecurityService _securityService;

    public AuthController(
        ApplicationDbContext db,
        ILogger<AuthController> logger,
        IAuditService auditService,
        IConfiguration configuration,
        ISecurityService securityService)
    {
        _db = db;
        _logger = logger;
        _auditService = auditService;
        _configuration = configuration;
        _securityService = securityService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Input validation
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required" });
            }

            var sanitizedUsername = _securityService.SanitizeInput(request.Username);
            
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == sanitizedUsername);

            if (user == null || !_securityService.VerifyPasswordTimingSafe(request.Password, user.PasswordHash))
            {
                _logger.LogWarning("Failed login attempt for user: {Username}", sanitizedUsername);
                
                await _auditService.LogActionAsync(
                    0,
                    "FAILED_LOGIN",
                    "User",
                    null, null, null,
                    null,
                    new { username = sanitizedUsername },
                    "Failed login attempt"
                );
                
                // Always return the same message to prevent username enumeration
                return Unauthorized(new { message = "Invalid credentials" });
            }

            if (!user.IsActive)
            {
                _logger.LogWarning("Login attempt for inactive user: {Username}", sanitizedUsername);
                
                await _auditService.LogActionAsync(
                    user.Id,
                    "LOGIN_INACTIVE",
                    "User",
                    null, null, null,
                    null,
                    new { username = user.Username },
                    "Attempt to login with inactive account"
                );
                
                return Unauthorized(new { message = "Invalid credentials" });
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            _db.Users.Update(user);
            await _db.SaveChangesAsync();

            // Log successful login
            await _auditService.LogActionAsync(
                user.Id,
                "LOGIN",
                "User",
                null, null, null,
                null,
                new { userId = user.Id, role = user.Role },
                "User logged in successfully"
            );

            _logger.LogInformation("User logged in successfully: {Username}", user.Username);

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
            _logger.LogError(ex, "Login error");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            // Input validation
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username, email, and password are required" });
            }

            // Validate username format
            if (!_securityService.ValidateUsername(request.Username))
            {
                return BadRequest(new 
                { 
                    message = "Username must be 3-50 characters, alphanumeric with underscore/hyphen only" 
                });
            }

            // Validate email format
            if (!_securityService.ValidateEmail(request.Email))
            {
                return BadRequest(new { message = "Invalid email format" });
            }

            // Validate password strength
            if (!_securityService.ValidatePassword(request.Password, out var errors))
            {
                return BadRequest(new { message = "Password does not meet requirements", errors });
            }

            var sanitizedUsername = _securityService.SanitizeInput(request.Username);
            var sanitizedEmail = _securityService.SanitizeInput(request.Email);

            if (await _db.Users.AnyAsync(u => u.Username == sanitizedUsername))
            {
                return BadRequest(new { message = "Username already exists" });
            }

            if (await _db.Users.AnyAsync(u => u.Email == sanitizedEmail))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var user = new User
            {
                Username = sanitizedUsername,
                Email = sanitizedEmail,
                FullName = _securityService.SanitizeInput(request.FullName ?? ""),
                PasswordHash = _securityService.HashPassword(request.Password),
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            // Log registration
            await _auditService.LogActionAsync(
                user.Id,
                "REGISTER",
                "User",
                null, null, null,
                null,
                new { userId = user.Id },
                "New user registered"
            );

            _logger.LogInformation("New user registered: {Username}", user.Username);

            return Ok(new { message = "User registered successfully", userId = user.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration error");
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }

    [HttpGet("verify")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> VerifyToken()
    {
        try
        {
            // Extract user ID from JWT claims (automatically validated by middleware)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null || !user.IsActive)
            {
                return Unauthorized();
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                role = user.Role.ToString(),
                isActive = user.IsActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token verification error");
            return Unauthorized();
        }
    }

    private string GenerateToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"];
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "StandartDesk";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "StandartDeskUsers";
        var jwtExpireDays = int.TryParse(_configuration["Jwt:ExpireDays"], out var days) ? days : 7;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
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
