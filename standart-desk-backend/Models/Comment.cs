namespace StandartDesk.Models;

public class Comment
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public TaskItem? Task { get; set; }
    public User? User { get; set; }

    // Mentioned users (stored as comma-separated IDs for simplicity)
    public string MentionedUserIds { get; set; } = string.Empty;
}
