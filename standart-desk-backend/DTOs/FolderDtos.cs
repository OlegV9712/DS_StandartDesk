namespace StandartDesk.DTOs;

public class CreateFolderDto
{
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
}

public class UpdateFolderDto
{
    public string Name { get; set; } = string.Empty;
}

public class FolderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OwnerId { get; set; }
    public int? ParentFolderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<FolderDto> SubFolders { get; set; } = new List<FolderDto>();
    public ICollection<ProjectDto> Projects { get; set; } = new List<ProjectDto>();
}
