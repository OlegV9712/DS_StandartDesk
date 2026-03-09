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

public class UsersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public UsersControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb")
                );
            });
        });
    }

    private async Task<string> GetAuthToken(string username, string password)
    {
        var client = _factory.CreateClient();
        var securityService = _factory.Services.GetRequiredService<ISecurityService>();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            if (!await db.Users.AnyAsync(u => u.Username == username))
            {
                var user = new User
                {
                    Username = username,
                    Email = $"{username}@example.com",
                    PasswordHash = securityService.HashPassword(password),
                    FullName = "Test User",
                    Role = UserRole.User,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
        }

        var loginRequest = new { username, password };
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
        var content = await loginResponse.Content.ReadAsAsync<dynamic>();
        return (string)content?.Token;
    }

    [Fact]
    public async Task GetUser_WithValidToken_ShouldReturnUserInfo()
    {
        // Arrange
        var client = _factory.CreateClient();
        var token = await GetAuthToken("testuser", "TestPass123!@#");

        // Act
        var getRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users/1");
        getRequest.Headers.Add("Authorization", $"Bearer {token}");
        var response = await client.SendAsync(getRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ShouldUpdateOwnProfile()
    {
        // Arrange
        var client = _factory.CreateClient();
        var securityService = _factory.Services.GetRequiredService<ISecurityService>();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = new User
            {
                Username = "updatetest",
                Email = "updatetest@example.com",
                PasswordHash = securityService.HashPassword("TestPass123!@#"),
                FullName = "Original Name",
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var token = await GetAuthToken("updatetest", "TestPass123!@#");
        
        var updateRequest = new
        {
            fullName = "Updated Name",
            avatar = "https://example.com/avatar.jpg",
            status = "Active"
        };

        // Act
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/users/2");
        request.Headers.Add("Authorization", $"Bearer {token}");
        request.Content = JsonContent.Create(updateRequest);
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsAsync<dynamic>();
        Assert.Equal("Updated Name", content?.user?.fullName);
    }

    [Fact]
    public async Task UpdateUser_ShouldNotAllowUpdatingOtherProfile()
    {
        // Arrange
        var client = _factory.CreateClient();
        var securityService = _factory.Services.GetRequiredService<ISecurityService>();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            var user1 = new User
            {
                Username = "user1",
                Email = "user1@example.com",
                PasswordHash = securityService.HashPassword("TestPass123!@#"),
                FullName = "User One",
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            var user2 = new User
            {
                Username = "user2",
                Email = "user2@example.com",
                PasswordHash = securityService.HashPassword("TestPass123!@#"),
                FullName = "User Two",
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            db.Users.AddRange(user1, user2);
            await db.SaveChangesAsync();
        }

        var token = await GetAuthToken("user1", "TestPass123!@#");
        
        var updateRequest = new { fullName = "Hacked Name" };

        // Act - Try to update user2 as user1
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/users/4"); // user2's ID
        request.Headers.Add("Authorization", $"Bearer {token}");
        request.Content = JsonContent.Create(updateRequest);
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_WithInvalidUrl_ShouldReturnBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var token = await GetAuthToken("testuser2", "TestPass123!@#");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == "testuser2");
            Assert.NotNull(user);
        }

        var updateRequest = new
        {
            avatar = "not-a-valid-url"
        };

        // Act
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/users/5");
        request.Headers.Add("Authorization", $"Bearer {token}");
        request.Content = JsonContent.Create(updateRequest);
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_WithoutAuth_ShouldReturnUnauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();
        var updateRequest = new { fullName = "Updated Name" };

        // Act
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/users/1");
        request.Content = JsonContent.Create(updateRequest);
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
