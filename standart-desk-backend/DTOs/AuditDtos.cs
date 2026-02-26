namespace StandartDesk.DTOs;

public class AuditLogDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RevertChangeDto
{
    public int VersionId { get; set; }
    public string? Reason { get; set; }
}
