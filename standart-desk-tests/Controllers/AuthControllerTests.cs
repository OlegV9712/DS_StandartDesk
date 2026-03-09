using System.Net;
using System.Net.Http.Json;
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Tests.Controllers;

public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real DB with in-memory
                var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb")
                );
            });
        });
    }

    [Fact]
    public async Task Register_WithValidData_ShouldReturnOk()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new
        {
            username = "testuser",
            email = "test@example.com",
            password = "TestPass123!@#",
            fullName = "Test User"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/auth/register", request);
        var content = await response.Content.ReadAsAsync<dynamic>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(content);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ShouldReturnBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new
        {
            username = "testuser",
            email = "invalid-email",
            password = "TestPass123!@#",
            fullName = "Test User"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ShouldReturnBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new
        {
            username = "testuser",
            email = "test@example.com",
            password = "weak",
            fullName = "Test User"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithDuplicateUsername_ShouldReturnBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new
        {
            username = "testuser",
            email = "test@example.com",
            password = "TestPass123!@#",
            fullName = "Test User"
        };

        // Act - Register first time
        var response1 = await client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);

        // Act - Register again with same username
        var response2 = await client.PostAsJsonAsync("/api/auth/register", request with { email = "another@example.com" });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response2.StatusCode);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnToken()
    {
        // Arrange
        var client = _factory.CreateClient();
        var securityService = _factory.Services.GetRequiredService<ISecurityService>();
        
        // Set up user in database
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = securityService.HashPassword("TestPass123!@#"),
                FullName = "Test User",
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var loginRequest = new
        {
            username = "testuser",
            password = "TestPass123!@#"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
        var content = await response.Content.ReadAsAsync<dynamic>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(content?.Token);
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ShouldReturnUnauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();
        var loginRequest = new
        {
            username = "nonexistent",
            password = "WrongPass123!@#"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Verify_WithValidToken_ShouldReturnUserInfo()
    {
        // Arrange
        var client = _factory.CreateClient();
        var securityService = _factory.Services.GetRequiredService<ISecurityService>();
        
        // Register and login
        var registerRequest = new
        {
            username = "testuser",
            email = "test@example.com",
            password = "TestPass123!@#",
            fullName = "Test User"
        };
        
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", registerRequest);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var loginRequest = new
        {
            username = "testuser",
            password = "TestPass123!@#"
        };
        
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
        var loginContent = await loginResponse.Content.ReadAsAsync<dynamic>();
        var token = (string)loginContent?.Token;

        // Act
        var verifyRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/verify");
        verifyRequest.Headers.Add("Authorization", $"Bearer {token}");
        var verifyResponse = await client.SendAsync(verifyRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);
    }

    [Fact]
    public async Task Verify_WithInvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var verifyRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/verify");
        verifyRequest.Headers.Add("Authorization", "Bearer invalid-token");
        var verifyResponse = await client.SendAsync(verifyRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, verifyResponse.StatusCode);
    }
}
