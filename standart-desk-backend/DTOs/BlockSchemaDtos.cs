namespace StandartDesk.DTOs;

public class CreateBlockSchemaDto
{
    public string Name { get; set; } = string.Empty;
    public int PageId { get; set; }
    public string Content { get; set; } = "{}";
}

public class UpdateBlockSchemaDto
{
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = "{}";
    public string? ChangeDescription { get; set; }
}

public class BlockSchemaVersionDto
{
    public int Id { get; set; }
    public int VersionNumber { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ChangeDescription { get; set; }
}
