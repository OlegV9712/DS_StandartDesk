namespace StandartDesk.Models;

public class Folder
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
    public int? ParentFolderId { get; set; }
    public Folder? ParentFolder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<Folder> SubFolders { get; set; } = new List<Folder>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
