namespace StandartDesk.DTOs;

public class CreateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Type { get; set; } = 0; // 0 = Algorithm, 1 = AssistantBot
    public int? FolderId { get; set; }
}

public class UpdateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class MoveProjectDto
{
    public int ProjectId { get; set; }
    public int? TargetFolderId { get; set; }
}

public class ProjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public int Type { get; set; } // 0 = Algorithm, 1 = AssistantBot
    public int? FolderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsArchived { get; set; }
    public string? CurrentOpenByUserName { get; set; }
    public ICollection<PageDto> Pages { get; set; } = new List<PageDto>();
}

public class PageDto
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public string? Thumbnail { get; set; }
}

public class BlockSchemaDto
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int PageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
