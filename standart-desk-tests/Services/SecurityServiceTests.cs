using Xunit;
using StandartDesk.Services;

namespace StandartDesk.Tests.Services;

public class SecurityServiceTests
{
    private readonly ISecurityService _securityService;

    public SecurityServiceTests()
    {
        _securityService = new SecurityService();
    }

    #region Password Hashing Tests

    [Fact]
    public void HashPassword_ShouldReturnValidHash()
    {
        // Arrange
        var password = "TestPassword123!";

        // Act
        var hash = _securityService.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
        Assert.Contains("$", hash);
    }

    [Fact]
    public void HashPassword_ShouldGenerateDifferentHashesForSamePassword()
    {
        // Arrange
        var password = "TestPassword123!";

        // Act
        var hash1 = _securityService.HashPassword(password);
        var hash2 = _securityService.HashPassword(password);

        // Assert
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void VerifyPasswordTimingSafe_ShouldReturnTrueForCorrectPassword()
    {
        // Arrange
        var password = "TestPassword123!";
        var hash = _securityService.HashPassword(password);

        // Act
        var result = _securityService.VerifyPasswordTimingSafe(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void VerifyPasswordTimingSafe_ShouldReturnFalseForIncorrectPassword()
    {
        // Arrange
        var password = "TestPassword123!";
        var wrongPassword = "WrongPassword123!";
        var hash = _securityService.HashPassword(password);

        // Act
        var result = _securityService.VerifyPasswordTimingSafe(wrongPassword, hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPasswordTimingSafe_ShouldReturnFalseForNullPassword()
    {
        // Arrange
        var hash = _securityService.HashPassword("TestPassword123!");

        // Act
        var result = _securityService.VerifyPasswordTimingSafe(null!, hash);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Email Validation Tests

    [Fact]
    public void ValidateEmail_ShouldReturnTrueForValidEmail()
    {
        // Arrange
        var validEmails = new[] { "test@example.com", "user@domain.co.uk", "name+tag@host.org" };

        // Act & Assert
        foreach (var email in validEmails)
        {
            Assert.True(_securityService.ValidateEmail(email), $"Email {email} should be valid");
        }
    }

    [Fact]
    public void ValidateEmail_ShouldReturnFalseForInvalidEmail()
    {
        // Arrange
        var invalidEmails = new[] { "notanemail", "invalid@", "@example.com", "user name@example.com" };

        // Act & Assert
        foreach (var email in invalidEmails)
        {
            Assert.False(_securityService.ValidateEmail(email), $"Email {email} should be invalid");
        }
    }

    #endregion

    #region Username Validation Tests

    [Fact]
    public void ValidateUsername_ShouldReturnTrueForValidUsername()
    {
        // Arrange
        var validUsernames = new[] { "user123", "john_doe", "test-user", "admin2024" };

        // Act & Assert
        foreach (var username in validUsernames)
        {
            Assert.True(_securityService.ValidateUsername(username), $"Username {username} should be valid");
        }
    }

    [Fact]
    public void ValidateUsername_ShouldReturnFalseForInvalidUsername()
    {
        // Arrange
        var invalidUsernames = new[] { "ab", "user@name", "user name", "user!@#" };

        // Act & Assert
        foreach (var username in invalidUsernames)
        {
            Assert.False(_securityService.ValidateUsername(username), $"Username {username} should be invalid");
        }
    }

    #endregion

    #region Password Validation Tests

    [Fact]
    public void ValidatePassword_ShouldReturnTrueForStrongPassword()
    {
        // Arrange
        var strongPassword = "StrongPass123!@#";

        // Act
        var result = _securityService.ValidatePassword(strongPassword, out var errors);

        // Assert
        Assert.True(result);
        Assert.Empty(errors);
    }

    [Fact]
    public void ValidatePassword_ShouldReturnFalseForWeakPassword()
    {
        // Arrange
        var weakPassword = "weak";

        // Act
        var result = _securityService.ValidatePassword(weakPassword, out var errors);

        // Assert
        Assert.False(result);
        Assert.NotEmpty(errors);
    }

    [Fact]
    public void ValidatePassword_ShouldCheckForUppercase()
    {
        // Arrange
        var passwordWithoutUppercase = "lowercase123!@#";

        // Act
        var result = _securityService.ValidatePassword(passwordWithoutUppercase, out var errors);

        // Assert
        Assert.False(result);
        Assert.Contains(errors, e => e.Contains("uppercase"));
    }

    [Fact]
    public void ValidatePassword_ShouldCheckForSpecialCharacters()
    {
        // Arrange
        var passwordWithoutSpecial = "NoSpecialChar123";

        // Act
        var result = _securityService.ValidatePassword(passwordWithoutSpecial, out var errors);

        // Assert
        Assert.False(result);
        Assert.Contains(errors, e => e.Contains("special"));
    }

    #endregion

    #region URL Validation Tests

    [Fact]
    public void IsValidUrl_ShouldReturnTrueForValidUrls()
    {
        // Arrange
        var validUrls = new[] { "http://example.com", "https://example.com/path", "https://example.com:8080/path?query=value" };

        // Act & Assert
        foreach (var url in validUrls)
        {
            Assert.True(_securityService.IsValidUrl(url), $"URL {url} should be valid");
        }
    }

    [Fact]
    public void IsValidUrl_ShouldReturnFalseForInvalidUrls()
    {
        // Arrange
        var invalidUrls = new[] { "not a url", "ftp://example.com", "javascript:alert('xss')" };

        // Act & Assert
        foreach (var url in invalidUrls)
        {
            Assert.False(_securityService.IsValidUrl(url), $"URL {url} should be invalid");
        }
    }

    #endregion

    #region Input Sanitization Tests

    [Fact]
    public void SanitizeInput_ShouldRemoveControlCharacters()
    {
        // Arrange
        var maliciousInput = "Hello\x00World\x1fTest";

        // Act
        var sanitized = _securityService.SanitizeInput(maliciousInput);

        // Assert
        Assert.DoesNotContain("\x00", sanitized);
        Assert.DoesNotContain("\x1f", sanitized);
    }

    [Fact]
    public void SanitizeInput_ShouldTrimWhitespace()
    {
        // Arrange
        var input = "  Hello World  ";

        // Act
        var sanitized = _securityService.SanitizeInput(input);

        // Assert
        Assert.Equal("Hello World", sanitized);
    }

    #endregion
}
