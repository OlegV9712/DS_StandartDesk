namespace StandartDesk.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    public int? PageId { get; set; }
    public Page? Page { get; set; }
    public int? BlockSchemaId { get; set; }
    public BlockSchema? BlockSchema { get; set; }
    public string Action { get; set; } = string.Empty; // "CREATE", "UPDATE", "DELETE", "MOVE_BLOCK", etc.
    public string EntityType { get; set; } = string.Empty; // "Project", "Page", "BlockSchema"
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Metadata { get; set; } // Additional JSON data
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
