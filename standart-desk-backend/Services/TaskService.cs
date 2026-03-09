using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;

namespace StandartDesk.Services;

public interface ITaskService
{
    Task<TaskDto> CreateTaskAsync(int projectId, int createdByUserId, CreateTaskDto dto);
    Task<TaskDto> UpdateTaskAsync(int projectId, int taskId, int userId, UpdateTaskDto dto);
    Task<TaskDto> GetTaskByIdAsync(int taskId);
    Task<List<TaskDto>> GetProjectTasksAsync(int projectId);
    Task<List<TaskDto>> GetAllTasksAsync();
    Task<TaskBoardDto> GetTaskBoardAsync(int projectId);
    Task<bool> DeleteTaskAsync(int taskId, int userId);
    Task<TaskDto> ChangeTaskStatusAsync(int taskId, WorkStatus newStatus);
    Task<TaskDto> ReassignTaskAsync(int taskId, int? newAssigneeId, int requestingUserId);
}

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TaskService> _logger;
    private readonly INotificationService _notificationService;

    public TaskService(ApplicationDbContext context, ILogger<TaskService> logger, INotificationService notificationService)
    {
        _context = context;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<TaskDto> CreateTaskAsync(int projectId, int createdByUserId, CreateTaskDto dto)
    {
        var user = await _context.Users.FindAsync(createdByUserId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Only Manager and Admin can create tasks for others
        if (dto.AssignedToUserId.HasValue && 
            dto.AssignedToUserId.Value != createdByUserId &&
            user.Role != UserRole.Manager && 
            user.Role != UserRole.Admin)
        {
            throw new UnauthorizedAccessException("Only managers and admins can create tasks for other users");
        }

        var taskItem = new TaskItem
        {
            ProjectId = projectId == 0 ? null : projectId, // NULL for global tasks
            TaskDomainId = dto.TaskDomainId,
            Title = dto.Title,
            Description = dto.Description,
            Priority = (TaskPriority)dto.Priority,
            AssignedToUserId = dto.AssignedToUserId,
            CreatedByUserId = createdByUserId,
            DueDate = dto.DueDate,
            Status = (WorkStatus)dto.Status,
            DisplayOrder = 0
        };

        _context.Tasks.Add(taskItem);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Task created: {TaskId}", taskItem.Id);

        // Send notification if task is assigned to someone
        // TODO: Fix notification creation - currently disabled due to FK issues
        // if (dto.AssignedToUserId.HasValue && dto.AssignedToUserId.Value != createdByUserId)
        // {
        //     try
        //     {
        //         var notificationDto = new CreateNotificationDto
        //         {
        //             UserId = dto.AssignedToUserId.Value,
        //             TaskId = taskItem.Id,
        //             NotificationType = (int)NotificationType.TaskAssigned,
        //             Title = $"New task assigned to you: '{dto.Title}'",
        //             Message = $"{user.FullName ?? user.Username} created a new task and assigned it to you",
        //             ActionUrl = $"/task/{taskItem.Id}",
        //             FromUserId = createdByUserId
        //         };
        //         await _notificationService.CreateNotificationAsync(notificationDto);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Failed to create notification for task assignment");
        //     }
        // }

        return MapToTaskDto(taskItem);
    }

    public async Task<TaskDto> UpdateTaskAsync(int projectId, int taskId, int userId, UpdateTaskDto dto)
    {
        // For global tasks (projectId == 0), find by taskId only  
        // For project tasks, find by taskId and projectId
        var task = await _context.Tasks
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == taskId && (projectId == 0 ? t.ProjectId == null : t.ProjectId == projectId));

        if (task == null)
            throw new InvalidOperationException("Task not found");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Only creator, assigned user, manager, or admin can update
        if (task.CreatedByUserId != userId && 
            task.AssignedToUserId != userId &&
            user.Role != UserRole.Manager && 
            user.Role != UserRole.Admin)
        {
            throw new UnauthorizedAccessException("You don't have permission to update this task");
        }

        // Regular users can only assign to themselves
        if (dto.AssignedToUserId.HasValue && 
            user.Role != UserRole.Manager && 
            user.Role != UserRole.Admin &&
            dto.AssignedToUserId.Value != userId)
        {
            throw new UnauthorizedAccessException("Users can only assign tasks to themselves");
        }

        if (!string.IsNullOrEmpty(dto.Title))
            task.Title = dto.Title;

        if (dto.Description != null)
            task.Description = dto.Description;

        if (dto.Status.HasValue)
            task.Status = (WorkStatus)dto.Status.Value;

        if (dto.Priority.HasValue)
            task.Priority = (TaskPriority)dto.Priority.Value;

        if (dto.AssignedToUserId.HasValue)
            task.AssignedToUserId = dto.AssignedToUserId;

        if (dto.DueDate.HasValue)
            task.DueDate = dto.DueDate;

        if (dto.TaskDomainId.HasValue)
            task.TaskDomainId = dto.TaskDomainId;

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Task updated: {TaskId}", taskId);
        return await GetTaskByIdAsync(taskId);
    }

    public async Task<TaskDto> GetTaskByIdAsync(int taskId)
    {
        var task = await _context.Tasks
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            throw new InvalidOperationException("Task not found");

        return MapToTaskDto(task);
    }

    public async Task<List<TaskDto>> GetProjectTasksAsync(int projectId)
    {
        var tasks = await _context.Tasks
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return tasks.Select(MapToTaskDto).ToList();
    }

    public async Task<List<TaskDto>> GetAllTasksAsync()
    {
        var tasks = await _context.Tasks
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return tasks.Select(MapToTaskDto).ToList();
    }

    public async Task<TaskBoardDto> GetTaskBoardAsync(int projectId)
    {
        var tasks = await GetProjectTasksAsync(projectId);
        
        var board = new TaskBoardDto();
        var statuses = Enum.GetValues(typeof(WorkStatus)).Cast<WorkStatus>();

        foreach (var status in statuses)
        {
            var statusTasks = tasks
                .Where(t => (WorkStatus)t.Status == status)
                .OrderBy(t => t.DisplayOrder)
                .ToList();

            var column = new TaskColumnDto
            {
                Status = (int)status,
                StatusName = status.ToString(),
                Tasks = statusTasks
            };
            
            board.Columns.Add(column);
        }

        return board;
    }

    public async Task<bool> DeleteTaskAsync(int taskId, int userId)
    {
        var task = await _context.Tasks
            .Include(t => t.CreatedByUser)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            throw new InvalidOperationException("Task not found");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Only creator, manager, or admin can delete
        if (task.CreatedByUserId != userId && 
            user.Role != UserRole.Manager && 
            user.Role != UserRole.Admin)
        {
            throw new UnauthorizedAccessException("You don't have permission to delete this task");
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Task deleted: {TaskId}", taskId);
        return true;
    }

    public async Task<TaskDto> ChangeTaskStatusAsync(int taskId, WorkStatus newStatus)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            throw new InvalidOperationException("Task not found");

        task.Status = newStatus;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetTaskByIdAsync(taskId);
    }

    public async Task<TaskDto> ReassignTaskAsync(int taskId, int? newAssigneeId, int requestingUserId)
    {
        var task = await _context.Tasks
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            throw new InvalidOperationException("Task not found");

        var user = await _context.Users.FindAsync(requestingUserId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Only assigned user, manager, or admin can reassign
        if (task.AssignedToUserId != requestingUserId && 
            user.Role != UserRole.Manager && 
            user.Role != UserRole.Admin)
        {
            throw new UnauthorizedAccessException("You don't have permission to reassign this task");
        }

        var previousAssigneeId = task.AssignedToUserId;
        var previousAssignee = task.AssignedToUser;

        // Validate assignee exists if provided
        if (newAssigneeId.HasValue)
        {
            var assignee = await _context.Users.FindAsync(newAssigneeId.Value);
            if (assignee == null)
                throw new InvalidOperationException("Assignee not found");
        }

        task.AssignedToUserId = newAssigneeId;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Send notification to new assignee
        if (newAssigneeId.HasValue && newAssigneeId != previousAssigneeId)
        {
            try
            {
                var notificationDto = new CreateNotificationDto
                {
                    UserId = newAssigneeId.Value,
                    TaskId = taskId,
                    NotificationType = (int)NotificationType.TaskReassigned,
                    Title = previousAssigneeId.HasValue 
                        ? $"Task '{task.Title}' reassigned to you"
                        : $"Task '{task.Title}' assigned to you",
                    Message = previousAssigneeId.HasValue
                        ? $"{previousAssignee?.FullName ?? previousAssignee?.Username} reassigned this task to you"
                        : $"{user.FullName ?? user.Username} assigned this task to you",
                    ActionUrl = $"/project/{task.ProjectId}/task/{taskId}",
                    FromUserId = requestingUserId
                };
                await _notificationService.CreateNotificationAsync(notificationDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification for task reassignment");
            }
        }

        _logger.LogInformation("Task {TaskId} reassigned from {OldAssignee} to {NewAssignee}", taskId, previousAssigneeId, newAssigneeId);
        return await GetTaskByIdAsync(taskId);
    }

    private TaskDto MapToTaskDto(TaskItem task)
    {
        return new TaskDto
        {
            Id = task.Id,
            ProjectId = task.ProjectId,
            TaskDomainId = task.TaskDomainId,
            Title = task.Title,
            Description = task.Description,
            Status = (int)task.Status,
            Priority = (int)task.Priority,
            AssignedToUserId = task.AssignedToUserId,
            AssignedToUserName = task.AssignedToUser?.FullName ?? task.AssignedToUser?.Username,
            AssignedToUserAvatar = task.AssignedToUser?.Avatar,
            CreatedByUserId = task.CreatedByUserId,
            CreatedByUserName = task.CreatedByUser?.FullName ?? task.CreatedByUser?.Username ?? "Unknown",
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            DueDate = task.DueDate,
            DisplayOrder = task.DisplayOrder
        };
    }
}
