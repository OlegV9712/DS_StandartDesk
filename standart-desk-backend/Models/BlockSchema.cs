namespace StandartDesk.Models;

public class BlockSchema
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int PageId { get; set; }
    public Page? Page { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = "{}"; // JSON serialized block data
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<BlockSchemaVersion> Versions { get; set; } = new List<BlockSchemaVersion>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
