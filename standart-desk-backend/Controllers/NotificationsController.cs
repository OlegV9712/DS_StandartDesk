using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StandartDesk.DTOs;
using StandartDesk.Services;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(INotificationService notificationService, ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Get all notifications for current user
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<List<NotificationDto>>> GetMyNotifications([FromQuery] bool unreadOnly = false)
    {
        try
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            var notifications = await _notificationService.GetUserNotificationsAsync(userId, unreadOnly);
            return Ok(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notifications");
            return StatusCode(500, new { message = "Error retrieving notifications" });
        }
    }

    /// <summary>
    /// Get unread count for current user
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        try
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread count");
            return StatusCode(500, new { message = "Error retrieving unread count" });
        }
    }

    /// <summary>
    /// Mark notification as read
    /// </summary>
    [HttpPut("{notificationId}/read")]
    public async Task<ActionResult<NotificationDto>> MarkAsRead(int notificationId)
    {
        try
        {
            var notification = await _notificationService.MarkAsReadAsync(notificationId);
            return Ok(notification);
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Notification not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read");
            return StatusCode(500, new { message = "Error processing request" });
        }
    }

    /// <summary>
    /// Mark all notifications as read for current user
    /// </summary>
    [HttpPut("mark-all-read")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            await _notificationService.MarkAllAsReadAsync(userId);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read");
            return StatusCode(500, new { message = "Error processing request" });
        }
    }

    /// <summary>
    /// Delete notification
    /// </summary>
    [HttpDelete("{notificationId}")]
    public async Task<ActionResult> DeleteNotification(int notificationId)
    {
        try
        {
            var result = await _notificationService.DeleteNotificationAsync(notificationId);
            if (!result)
                return NotFound(new { message = "Notification not found" });

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification");
            return StatusCode(500, new { message = "Error processing request" });
        }
    }
}
