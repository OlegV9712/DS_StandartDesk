namespace StandartDesk.Models;

public enum NotificationType
{
    TaskAssigned = 0,
    TaskReassigned = 1,
    TaskCompleted = 2,
    TaskCommented = 3,
    TaskStatusChanged = 4,
    TaskDueDate = 5
}

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TaskId { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ActionUrl { get; set; }
    public int? FromUserId { get; set; } // Who triggered the notification
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public TaskItem? Task { get; set; }
    public User? FromUser { get; set; }
}
