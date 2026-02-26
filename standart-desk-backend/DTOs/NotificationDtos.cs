namespace StandartDesk.DTOs;

public class NotificationDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TaskId { get; set; }
    public int NotificationType { get; set; }
    public string NotificationTypeName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ActionUrl { get; set; }
    public int? FromUserId { get; set; }
    public string? FromUserName { get; set; }
    public string? FromUserAvatar { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class CreateNotificationDto
{
    public int UserId { get; set; }
    public int TaskId { get; set; }
    public int NotificationType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ActionUrl { get; set; }
    public int? FromUserId { get; set; }
}

public class MarkNotificationAsReadDto
{
    public int NotificationId { get; set; }
}
