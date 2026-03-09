namespace StandartDesk.DTOs;

public class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Priority { get; set; } = 1; // Default to Medium priority
    public int? AssignedToUserId { get; set; }
    public DateTime? DueDate { get; set; }
    public int Status { get; set; } = 0; // Default to To Do
    public int? TaskDomainId { get; set; }
}

public class UpdateTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Status { get; set; }
    public int? Priority { get; set; }
    public int? AssignedToUserId { get; set; }
    public DateTime? DueDate { get; set; }
    public int? TaskDomainId { get; set; }
}

public class TaskDto
{
    public int Id { get; set; }
    public int? ProjectId { get; set; } // Nullable for global tasks
    public int? TaskDomainId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Status { get; set; }
    public int Priority { get; set; }
    public int? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public string? AssignedToUserAvatar { get; set; }
    public int CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int DisplayOrder { get; set; }
}

public class TaskBoardDto
{
    public List<TaskColumnDto> Columns { get; set; } = new List<TaskColumnDto>();
}

public class TaskColumnDto
{
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public List<TaskDto> Tasks { get; set; } = new List<TaskDto>();
}
