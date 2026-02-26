using Microsoft.EntityFrameworkCore;
using StandartDesk.Data;
using StandartDesk.DTOs;
using StandartDesk.Models;

namespace StandartDesk.Services;

public interface INotificationService
{
    Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto);
    Task<List<NotificationDto>> GetUserNotificationsAsync(int userId, bool unreadOnly = false);
    Task<int> GetUnreadCountAsync(int userId);
    Task<NotificationDto> MarkAsReadAsync(int notificationId);
    Task MarkAllAsReadAsync(int userId);
    Task<bool> DeleteNotificationAsync(int notificationId);
}

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ApplicationDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto)
    {
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        var task = await _context.Tasks.FindAsync(dto.TaskId);
        if (task == null)
            throw new InvalidOperationException("Task not found");

        var notification = new Notification
        {
            UserId = dto.UserId,
            TaskId = dto.TaskId,
            Type = (NotificationType)dto.NotificationType,
            Title = dto.Title,
            Message = dto.Message,
            ActionUrl = dto.ActionUrl,
            FromUserId = dto.FromUserId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notification created for user {UserId} about task {TaskId}", dto.UserId, dto.TaskId);

        return await GetNotificationDtoAsync(notification);
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(int userId, bool unreadOnly = false)
    {
        var query = _context.Notifications
            .Include(n => n.User)
            .Include(n => n.Task)
            .Include(n => n.FromUser)
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(n => ConvertToDto(n)).ToList();
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task<NotificationDto> MarkAsReadAsync(int notificationId)
    {
        var notification = await _context.Notifications
            .Include(n => n.User)
            .Include(n => n.Task)
            .Include(n => n.FromUser)
            .FirstOrDefaultAsync(n => n.Id == notificationId);

        if (notification == null)
            throw new InvalidOperationException("Notification not found");

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notification {NotificationId} marked as read", notificationId);

        return ConvertToDto(notification);
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("All notifications marked as read for user {UserId}", userId);
    }

    public async Task<bool> DeleteNotificationAsync(int notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null)
            return false;

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Notification {NotificationId} deleted", notificationId);
        return true;
    }

    private NotificationDto ConvertToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            UserId = notification.UserId,
            TaskId = notification.TaskId,
            NotificationType = (int)notification.Type,
            NotificationTypeName = notification.Type.ToString(),
            Title = notification.Title,
            Message = notification.Message,
            ActionUrl = notification.ActionUrl,
            FromUserId = notification.FromUserId,
            FromUserName = notification.FromUser?.Username,
            FromUserAvatar = notification.FromUser?.Avatar,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt,
            ReadAt = notification.ReadAt
        };
    }

    private async Task<NotificationDto> GetNotificationDtoAsync(Notification notification)
    {
        var user = await _context.Users.FindAsync(notification.UserId);
        var fromUser = notification.FromUserId.HasValue 
            ? await _context.Users.FindAsync(notification.FromUserId.Value)
            : null;

        return new NotificationDto
        {
            Id = notification.Id,
            UserId = notification.UserId,
            TaskId = notification.TaskId,
            NotificationType = (int)notification.Type,
            NotificationTypeName = notification.Type.ToString(),
            Title = notification.Title,
            Message = notification.Message,
            ActionUrl = notification.ActionUrl,
            FromUserId = notification.FromUserId,
            FromUserName = fromUser?.Username,
            FromUserAvatar = fromUser?.Avatar,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt,
            ReadAt = notification.ReadAt
        };
    }
}
