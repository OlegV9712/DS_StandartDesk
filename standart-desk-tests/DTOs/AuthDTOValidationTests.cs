using Xunit;
using StandartDesk.Controllers;

namespace StandartDesk.Tests.DTOs;

public class AuthDTOValidationTests
{
    [Fact]
    public void LoginRequest_ShouldHaveRequiredProperties()
    {
        // Arrange
        var request = new LoginRequest
        {
            Username = "testuser",
            Password = "TestPass123!@#"
        };

        // Assert
        Assert.NotNull(request.Username);
        Assert.NotNull(request.Password);
        Assert.False(string.IsNullOrEmpty(request.Username));
        Assert.False(string.IsNullOrEmpty(request.Password));
    }

    [Fact]
    public void RegisterRequest_ShouldHaveRequiredProperties()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "TestPass123!@#",
            FullName = "Test User"
        };

        // Assert
        Assert.NotNull(request.Username);
        Assert.NotNull(request.Email);
        Assert.NotNull(request.Password);
    }

    [Fact]
    public void LoginResponse_ShouldContainToken()
    {
        // Arrange
        var response = new LoginResponse
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            FullName = "Test User",
            Role = "User",
            Token = "test-token"
        };

        // Assert
        Assert.NotNull(response.Token);
        Assert.False(string.IsNullOrEmpty(response.Token));
    }
}
