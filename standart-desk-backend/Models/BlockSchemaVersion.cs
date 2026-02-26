namespace StandartDesk.Models;

public class BlockSchemaVersion
{
    public int Id { get; set; }
    public int BlockSchemaId { get; set; }
    public BlockSchema? BlockSchema { get; set; }
    public int VersionNumber { get; set; }
    public string Content { get; set; } = "{}"; // JSON serialized block data
    public int CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ChangeDescription { get; set; }
}
