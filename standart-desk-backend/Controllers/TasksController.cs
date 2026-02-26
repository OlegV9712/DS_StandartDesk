using Microsoft.AspNetCore.Mvc;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(ITaskService taskService, ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    /// <summary>
    /// Get all tasks (for global task view)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetAllTasks()
    {
        try
        {
            var tasks = await _taskService.GetAllTasksAsync();
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all tasks");
            return StatusCode(500, new { message = "Error retrieving tasks" });
        }
    }

    /// <summary>
    /// Get all tasks for a project (kanban board view)
    /// </summary>
    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<TaskBoardDto>> GetTaskBoard(int projectId)
    {
        try
        {
            var board = await _taskService.GetTaskBoardAsync(projectId);
            return Ok(board);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting task board for project {ProjectId}", projectId);
            return StatusCode(500, new { message = "Error retrieving task board" });
        }
    }

    /// <summary>
    /// Get all tasks for a project (list view)
    /// </summary>
    [HttpGet("project/{projectId}/list")]
    public async Task<ActionResult<List<TaskDto>>> GetProjectTasks(int projectId)
    {
        try
        {
            var tasks = await _taskService.GetProjectTasksAsync(projectId);
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tasks for project {ProjectId}", projectId);
            return StatusCode(500, new { message = "Error retrieving tasks" });
        }
    }

    /// <summary>
    /// Get a specific task
    /// </summary>
    [HttpGet("{taskId}")]
    public async Task<ActionResult<TaskDto>> GetTask(int taskId)
    {
        try
        {
            var task = await _taskService.GetTaskByIdAsync(taskId);
            return Ok(task);
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Task not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error retrieving task" });
        }
    }

    /// <summary>
    /// Create a new task (global task, not tied to a specific project)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto, [FromQuery] int? projectId = null, [FromQuery] int? userId = null)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required" });

        try
        {
            var requestingUserId = userId ?? 1; // Default fallback
            var taskProjectId = projectId ?? 0; // 0 = not tied to a specific project
            var task = await _taskService.CreateTaskAsync(taskProjectId, requestingUserId, dto);
            return CreatedAtAction(nameof(GetTask), new { taskId = task.Id }, task);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return StatusCode(500, new { message = "Error creating task" });
        }
    }

    /// <summary>
    /// Create a new task in a project (old endpoint - deprecated)
    /// Only managers and admins can create tasks for others
    /// </summary>
    [HttpPost("project/{projectId}")]
    public async Task<ActionResult<TaskDto>> CreateTaskOld(int projectId, [FromBody] CreateTaskDto dto, [FromQuery] int userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required" });

        try
        {
            var task = await _taskService.CreateTaskAsync(projectId, userId, dto);
            return CreatedAtAction(nameof(GetTask), new { taskId = task.Id }, task);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task for project {ProjectId}", projectId);
            return StatusCode(500, new { message = "Error creating task" });
        }
    }

    /// <summary>
    /// Update a task
    /// Creator, assigned user, managers, and admins can update
    /// </summary>
    [HttpPut("{taskId}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(
        int taskId,
        [FromBody] UpdateTaskDto dto,
        [FromQuery] int? projectId = null,
        [FromQuery] int? userId = null)
    {
        try
        {
            var requestingUserId = userId ?? 1; // Default fallback
            var taskProjectId = projectId ?? 0; // 0 = not project-specific
            var task = await _taskService.UpdateTaskAsync(taskProjectId, taskId, requestingUserId, dto);
            return Ok(task);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error updating task" });
        }
    }

    /// <summary>
    /// Change task status
    /// </summary>
    [HttpPut("{taskId}/status")]
    public async Task<ActionResult<TaskDto>> ChangeStatusPut(int taskId, [FromQuery] int status)
    {
        try
        {
            var task = await _taskService.ChangeTaskStatusAsync(taskId, (WorkStatus)status);
            return Ok(task);
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Task not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing task status for task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error changing task status" });
        }
    }

    /// <summary>
    /// Change task status (old endpoint - deprecated)
    /// </summary>
    [HttpPatch("{taskId}/status")]
    public async Task<ActionResult<TaskDto>> ChangeStatus(int taskId, [FromBody] ChangeStatusDto dto)
    {
        try
        {
            var task = await _taskService.ChangeTaskStatusAsync(taskId, dto.Status);
            return Ok(task);
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Task not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing task status for task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error changing task status" });
        }
    }

    /// <summary>
    /// Reassign task to another user
    /// Only assigned user, managers, and admins can reassign
    /// </summary>
    [HttpPut("{taskId}/assignee")]
    public async Task<ActionResult<TaskDto>> ReassignTask(int taskId, [FromQuery] int? newAssigneeId, [FromQuery] int? userId = null)
    {
        try
        {
            // If userId is not provided, you might need to get it from claims
            // For now, we'll assume it's provided
            var requestingUserId = userId ?? 1; // Default fallback
            var task = await _taskService.ReassignTaskAsync(taskId, newAssigneeId, requestingUserId);
            return Ok(task);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reassigning task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error reassigning task" });
        }
    }

    /// <summary>
    /// Reassign task to another user (old endpoint - deprecated)
    /// Only assigned user, managers, and admins can reassign
    /// </summary>
    [HttpPatch("{taskId}/assign")]
    public async Task<ActionResult<TaskDto>> ReassignTaskOld(
        int taskId,
        [FromBody] ReassignTaskDto dto,
        [FromQuery] int userId)
    {
        try
        {
            var task = await _taskService.ReassignTaskAsync(taskId, dto.AssignedToUserId, userId);
            return Ok(task);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reassigning task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error reassigning task" });
        }
    }

    /// <summary>
    /// Delete a task
    /// Only creator, managers, and admins can delete
    /// </summary>
    [HttpDelete("{taskId}")]
    public async Task<ActionResult> DeleteTask(int taskId, [FromQuery] int? userId = null)
    {
        try
        {
            var requestingUserId = userId ?? 1; // Default fallback
            await _taskService.DeleteTaskAsync(taskId, requestingUserId);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Task not found" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error deleting task" });
        }
    }
}

/// <summary>
/// DTO for changing task status
/// </summary>
public class ChangeStatusDto
{
    public WorkStatus Status { get; set; }
}

/// <summary>
/// DTO for reassigning task
/// </summary>
public class ReassignTaskDto
{
    public int? AssignedToUserId { get; set; }
}
