using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using StandartDesk.DTOs;
using StandartDesk.Services;
using System.Security.Claims;

namespace StandartDesk.Controllers;

[ApiController]
[Route("api/chatbot")]
[AllowAnonymous]
[EnableCors("AllowFrontend")]
public class ChatbotController : ControllerBase
{
    private readonly ChatbotService _chatbotService;
    private readonly ILogger<ChatbotController> _logger;

    public ChatbotController(ChatbotService chatbotService, ILogger<ChatbotController> logger)
    {
        _chatbotService = chatbotService;
        _logger = logger;
    }

    /// <summary>
    /// Стартует новую сессию диалога
    /// POST /api/chatbot/projects/{projectId}/session/start
    /// </summary>
    [HttpPost("projects/{projectId}/session/start")]
    public async Task<ActionResult<ChatSessionStartDto>> StartSession(int projectId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            _logger.LogInformation($"User {userId} starting chat session for project {projectId}");

            var sessionStart = await _chatbotService.StartSessionAsync(projectId, userId);
            
            if (sessionStart == null)
            {
                return BadRequest("Failed to start chat session. Project may not have a valid scenario.");
            }

            return Ok(sessionStart);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error starting session: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Отправляет сообщение или кнопку в активную сессию
    /// POST /api/chatbot/session/{sessionId}/message
    /// </summary>
    [HttpPost("session/{sessionId}/message")]
    public async Task<ActionResult<ChatBlockResponseDto>> SendMessage(int sessionId, [FromBody] ChatMessageDto input)
    {
        try
        {
            if (input == null)
            {
                return BadRequest("Message input is required");
            }

            if (string.IsNullOrEmpty(input.Message) && string.IsNullOrEmpty(input.SelectedButtonId))
            {
                return BadRequest("Either message or selectedButtonId must be provided");
            }

            _logger.LogInformation($"Processing input for session {sessionId}");

            var response = await _chatbotService.ProcessUserInputAsync(sessionId, input);

            if (response == null)
            {
                return BadRequest("Session not found or invalid");
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing message: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Получает историю диалога
    /// GET /api/chatbot/session/{sessionId}/history
    /// </summary>
    [HttpGet("session/{sessionId}/history")]
    public async Task<ActionResult<List<ChatMessageHistoryDto>>> GetHistory(int sessionId)
    {
        try
        {
            var history = await _chatbotService.GetSessionHistoryAsync(sessionId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving history: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Завершает сессию
    /// POST /api/chatbot/session/{sessionId}/end
    /// </summary>
    [HttpPost("session/{sessionId}/end")]
    public async Task<ActionResult> EndSession(int sessionId)
    {
        try
        {
            var result = await _chatbotService.EndSessionAsync(sessionId);
            
            if (!result)
            {
                return BadRequest("Session not found");
            }

            return Ok(new { message = "Session ended successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error ending session: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Очищает историю диалога в сессии
    /// POST /api/chatbot/session/{sessionId}/clear-history
    /// </summary>
    [HttpPost("session/{sessionId}/clear-history")]
    public async Task<ActionResult> ClearHistory(int sessionId)
    {
        try
        {
            var result = await _chatbotService.ClearSessionHistoryAsync(sessionId);
            
            if (!result)
            {
                return BadRequest("Session not found");
            }

            return Ok(new { message = "History cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error clearing history: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Получает текущий ID пользователя из токена
    /// </summary>
    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }
        return null;
    }
}
