namespace StandartDesk.Models;

public enum WorkStatus
{
    ToDo = 0,
    InProgress = 1,
    InReview = 2,
    Done = 3
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public class TaskItem
{
    public int Id { get; set; }
    public int? ProjectId { get; set; } // Nullable for global tasks (not tied to a specific project)
    public int? TaskDomainId { get; set; } // New field for task domain/area
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public WorkStatus Status { get; set; } = WorkStatus.ToDo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public int? AssignedToUserId { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime? DueDate { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Project? Project { get; set; }
    public TaskDomain? TaskDomain { get; set; }
    public User? AssignedToUser { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<Comment> TaskComments { get; set; } = new List<Comment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

public class TaskComment
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public TaskItem? Task { get; set; }
    public User? User { get; set; }
}
