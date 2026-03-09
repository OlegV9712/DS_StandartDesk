namespace StandartDesk.Models;

public class TaskDomain
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; } = "#007BFF"; // Color for UI representation
    public string? Icon { get; set; } // Emoji or icon name
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public User? CreatedByUser { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<TaskDomainAccess> DomainAccess { get; set; } = new List<TaskDomainAccess>();
}

public class TaskDomainAccess
{
    public int Id { get; set; }
    public int TaskDomainId { get; set; }
    public int UserId { get; set; }
    public bool CanView { get; set; } = true;
    public bool CanEdit { get; set; } = false;
    public bool CanDelete { get; set; } = false;
    public bool IsManager { get; set; } = false; // Manager can manage access for this domain
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public TaskDomain? TaskDomain { get; set; }
    public User? User { get; set; }
}
