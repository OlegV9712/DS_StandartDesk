namespace StandartDesk.Models;

public enum UserRole
{
    Admin = 0,
    Manager = 1,
    User = 2,
    Guest = 3
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Avatar { get; set; } = "👤"; // Default avatar
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    // Navigation
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Notification>? SentNotifications { get; set; } = new List<Notification>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<TaskDomain> CreatedTaskDomains { get; set; } = new List<TaskDomain>();
    public ICollection<TaskDomainAccess> TaskDomainAccess { get; set; } = new List<TaskDomainAccess>();
}
