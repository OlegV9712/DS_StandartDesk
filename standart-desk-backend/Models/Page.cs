namespace StandartDesk.Models;

public class Page
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; } = 0;
    public string? Thumbnail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<BlockSchema> BlockSchemas { get; set; } = new List<BlockSchema>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
