using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace StandartDesk.Services;

public interface ISecurityService
{
    string HashPassword(string password);
    bool VerifyPasswordTimingSafe(string password, string hash);
    bool ValidateEmail(string email);
    bool ValidateUsername(string username);
    bool ValidatePassword(string password, out List<string> errors);
    string SanitizeInput(string input);
    bool IsValidUrl(string url);
}

public class SecurityService : ISecurityService
{
    private const int PasswordMinLength = 8;
    private const int PasswordMaxLength = 256;
    private const int Iterations = 50000;

    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password cannot be empty");

        using (var algorithm = new Rfc2898DeriveBytes(password, 16, Iterations, HashAlgorithmName.SHA256))
        {
            var key = Convert.ToBase64String(algorithm.GetBytes(20));
            var salt = Convert.ToBase64String(algorithm.Salt);

            return $"{salt}${key}";
        }
    }

    public bool VerifyPasswordTimingSafe(string password, string hash)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
                return false;

            var parts = hash.Split('$');
            if (parts.Length != 2)
                return false;

            var salt = Convert.FromBase64String(parts[0]);
            var storedHash = parts[1];

            using (var algorithm = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256))
            {
                var computedHash = Convert.ToBase64String(algorithm.GetBytes(20));
                
                // Constant-time comparison to prevent timing attacks
                return CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(storedHash),
                    Encoding.UTF8.GetBytes(computedHash)
                );
            }
        }
        catch
        {
            return false;
        }
    }

    public bool ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
            return false;

        try
        {
            var pattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
            return Regex.IsMatch(email, pattern, RegexOptions.IgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public bool ValidateUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return false;

        if (username.Length < 3 || username.Length > 50)
            return false;

        // Allow alphanumeric, underscore, hyphen only
        var pattern = @"^[a-zA-Z0-9_-]+$";
        return Regex.IsMatch(username, pattern);
    }

    public bool ValidatePassword(string password, out List<string> errors)
    {
        errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Password cannot be empty");
            return false;
        }

        if (password.Length < PasswordMinLength)
            errors.Add($"Password must be at least {PasswordMinLength} characters");

        if (password.Length > PasswordMaxLength)
            errors.Add($"Password must not exceed {PasswordMaxLength} characters");

        if (!Regex.IsMatch(password, @"[A-Z]"))
            errors.Add("Password must contain at least one uppercase letter");

        if (!Regex.IsMatch(password, @"[a-z]"))
            errors.Add("Password must contain at least one lowercase letter");

        if (!Regex.IsMatch(password, @"[0-9]"))
            errors.Add("Password must contain at least one digit");

        if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};:'"",.<>?/\\|`~]"))
            errors.Add("Password must contain at least one special character");

        return errors.Count == 0;
    }

    public string SanitizeInput(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove control characters and trim
        var sanitized = System.Text.RegularExpressions.Regex.Replace(input, @"[\x00-\x1F\x7F]", "");
        return sanitized.Trim();
    }

    public bool IsValidUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        try
        {
            var uri = new Uri(url, UriKind.Absolute);
            return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;
        }
        catch
        {
            return false;
        }
    }
}
