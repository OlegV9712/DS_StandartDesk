using Microsoft.AspNetCore.SignalR;
using StandartDesk.Data;

namespace StandartDesk.Hubs;

public class ProjectHub : Hub
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProjectHub> _logger;

    public ProjectHub(ApplicationDbContext context, ILogger<ProjectHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client {ConnectionId} connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinProjectAsync(int projectId, int userId, string userName)
    {
        var groupName = $"project_{projectId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        // Log user opening the project
        var project = await _context.Projects.FindAsync(projectId);
        if (project != null)
        {
            var previousUser = project.CurrentOpenByUserId;
            project.CurrentOpenByUserId = userId;
            await _context.SaveChangesAsync();

            // Notify others that a user opened the project
            await Clients.Group(groupName).SendAsync(
                "ProjectOpenedNotification",
                new
                {
                    ProjectId = projectId,
                    UserId = userId,
                    UserName = userName,
                    Timestamp = DateTime.UtcNow
                }
            );

            _logger.LogInformation("User {UserId} ({UserName}) joined project {ProjectId}", userId, userName, projectId);
        }
    }

    public async Task LeaveProjectAsync(int projectId, int userId)
    {
        var groupName = $"project_{projectId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        var project = await _context.Projects.FindAsync(projectId);
        if (project != null && project.CurrentOpenByUserId == userId)
        {
            project.CurrentOpenByUserId = null;
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("User {UserId} left project {ProjectId}", userId, projectId);
    }

    public async Task NotifyBlockChangedAsync(int projectId, int pageId, int blockId, object blockData)
    {
        var groupName = $"project_{projectId}";
        await Clients.Group(groupName).SendAsync(
            "BlockChanged",
            new
            {
                PageId = pageId,
                BlockId = blockId,
                BlockData = blockData,
                Timestamp = DateTime.UtcNow
            }
        );

        _logger.LogInformation("Block {BlockId} changed on page {PageId}", blockId, pageId);
    }

    public async Task NotifyPageAddedAsync(int projectId, int pageId, string pageName)
    {
        var groupName = $"project_{projectId}";
        await Clients.Group(groupName).SendAsync(
            "PageAdded",
            new
            {
                ProjectId = projectId,
                PageId = pageId,
                PageName = pageName,
                Timestamp = DateTime.UtcNow
            }
        );
    }

    public async Task NotifyPageDeletedAsync(int projectId, int pageId)
    {
        var groupName = $"project_{projectId}";
        await Clients.Group(groupName).SendAsync(
            "PageDeleted",
            new
            {
                ProjectId = projectId,
                PageId = pageId,
                Timestamp = DateTime.UtcNow
            }
        );
    }

    public async Task NotifyPageReorderedAsync(int projectId, List<(int PageId, int Order)> pageOrders)
    {
        var groupName = $"project_{projectId}";
        await Clients.Group(groupName).SendAsync(
            "PagesReordered",
            new
            {
                ProjectId = projectId,
                Pages = pageOrders.Select(p => new { p.PageId, p.Order }).ToList(),
                Timestamp = DateTime.UtcNow
            }
        );
    }
}
