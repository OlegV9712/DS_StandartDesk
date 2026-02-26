using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using StandartDesk.Data;
using StandartDesk.Models;
using StandartDesk.DTOs;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(ApplicationDbContext db, ILogger<CommentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all comments for a task
    /// </summary>
    [HttpGet("task/{taskId}")]
    public async Task<ActionResult<List<CommentDto>>> GetTaskComments(int taskId)
    {
        try
        {
            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null)
                return NotFound(new { message = "Task not found" });

            var comments = await _db.Comments
                .Where(c => c.TaskId == taskId)
                .Include(c => c.User)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    TaskId = c.TaskId,
                    UserId = c.UserId,
                    UserName = c.User!.Username,
                    UserAvatar = c.User.Avatar ?? "👤",
                    Text = c.Text,
                    MentionedUserIds = c.MentionedUserIds,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();

            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting comments for task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error retrieving comments" });
        }
    }

    /// <summary>
    /// Create a comment on a task
    /// </summary>
    [HttpPost("task/{taskId}")]
    public async Task<ActionResult<CommentDto>> CreateComment(int taskId, [FromBody] CreateCommentDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest(new { message = "Comment text is required" });

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null)
                return NotFound(new { message = "Task not found" });

            var userId = GetCurrentUserId();
            if (userId == 0)
                return Unauthorized(new { message = "User not authenticated" });

            var user = await _db.Users.FindAsync(userId);
            if (user == null)
                return BadRequest(new { message = "User not found" });

            // Parse @mentions from text
            var mentionedUserIds = ExtractMentionedUserIds(dto.Text);

            var comment = new Comment
            {
                TaskId = taskId,
                UserId = userId,
                Text = dto.Text,
                MentionedUserIds = string.Join(",", mentionedUserIds),
                CreatedAt = DateTime.UtcNow
            };

            _db.Comments.Add(comment);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Comment created on task {TaskId} by user {UserId}", taskId, userId);

            return CreatedAtAction(nameof(GetTaskComments), new { taskId }, new CommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                UserId = comment.UserId,
                UserName = user.Username,
                UserAvatar = user.Avatar ?? "👤",
                Text = comment.Text,
                MentionedUserIds = comment.MentionedUserIds,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating comment on task {TaskId}", taskId);
            return StatusCode(500, new { message = "Error creating comment" });
        }
    }

    /// <summary>
    /// Delete a comment (only author or admin)
    /// </summary>
    [HttpDelete("{commentId}")]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        try
        {
            var comment = await _db.Comments.FindAsync(commentId);
            if (comment == null)
                return NotFound(new { message = "Comment not found" });

            var userId = GetCurrentUserId();
            var user = await _db.Users.FindAsync(userId);

            // Only author or admin can delete
            if (comment.UserId != userId && user?.Role != UserRole.Admin)
                return Forbid("You don't have permission to delete this comment");

            _db.Comments.Remove(comment);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Comment {CommentId} deleted", commentId);
            return Ok(new { message = "Comment deleted" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment {CommentId}", commentId);
            return StatusCode(500, new { message = "Error deleting comment" });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("userId");
        return int.TryParse(userIdClaim?.Value, out var id) ? id : 0;
    }

    private List<int> ExtractMentionedUserIds(string text)
    {
        var mentionedIds = new List<int>();
        var regex = new System.Text.RegularExpressions.Regex(@"@(\w+)");
        var matches = regex.Matches(text);
        
        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            var username = match.Groups[1].Value;
            var user = _db.Users.FirstOrDefault(u => u.Username == username);
            if (user != null)
                mentionedIds.Add(user.Id);
        }

        return mentionedIds;
    }
}
