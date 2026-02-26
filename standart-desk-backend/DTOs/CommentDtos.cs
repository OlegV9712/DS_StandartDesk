namespace StandartDesk.DTOs;

public class CommentDto
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserAvatar { get; set; } = "👤";
    public string Text { get; set; } = string.Empty;
    public string MentionedUserIds { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCommentDto
{
    public string Text { get; set; } = string.Empty;
}

public class UpdateCommentDto
{
    public string Text { get; set; } = string.Empty;
}
