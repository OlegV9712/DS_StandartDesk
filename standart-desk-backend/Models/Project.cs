namespace StandartDesk.Models;

public enum ProjectType
{
    Algorithm = 0,     // Standard flowchart
    AssistantBot = 1   // Chatbot
}

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
    public ProjectType Type { get; set; } = ProjectType.Algorithm;
    public int? FolderId { get; set; }
    public Folder? Folder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsArchived { get; set; } = false;
    public int? CurrentOpenByUserId { get; set; }

    // Navigation
    public ICollection<Page> Pages { get; set; } = new List<Page>();
    public ICollection<BlockSchema> BlockSchemas { get; set; } = new List<BlockSchema>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
