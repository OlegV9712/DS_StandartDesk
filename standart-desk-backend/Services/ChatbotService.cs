using System.Text.Json;
using System.Text.Json.Serialization;
using StandartDesk.DTOs;
using StandartDesk.Models;
using StandartDesk.Data;
using Microsoft.EntityFrameworkCore;

namespace StandartDesk.Services;

/// <summary>
/// Сервис для обработки сценариев чат-ботов
/// Интерпретирует BlockSchema и управляет диалогом
/// </summary>
public class ChatbotService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ChatbotService> _logger;

    public ChatbotService(ApplicationDbContext context, ILogger<ChatbotService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Стартует новую сессию диалога с чат-ботом
    /// </summary>
    public async Task<ChatSessionStartDto?> StartSessionAsync(int projectId, int? userId)
    {
        try
        {
            _logger.LogInformation($"Starting chat session for project {projectId}");

            // Получаем проект
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
            {
                _logger.LogWarning($"Project {projectId} not found");
                return null;
            }

            _logger.LogInformation($"Found project: {project.Name}");

            // Получаем первую страницу проекта
            var page = await _context.Pages
                .Where(p => p.ProjectId == projectId)
                .FirstOrDefaultAsync();

            if (page == null)
            {
                _logger.LogWarning($"No pages found for project {projectId}");
                // Попробуем получить BlockSchemas прямо для проекта (для старой версии данных)
                var directBlockSchema = await _context.BlockSchemas
                    .Where(bs => bs.Page != null && bs.Page.ProjectId == projectId)
                    .FirstOrDefaultAsync();
                
                if (directBlockSchema == null)
                {
                    _logger.LogWarning($"No block schemas found for project {projectId}");
                    return null;
                }

                return await InitializeSessionFromBlockSchema(projectId, directBlockSchema, userId);
            }

            _logger.LogInformation($"Found page: {page.Name}");

            // Получаем блок-схему
            var blockSchema = await _context.BlockSchemas
                .Where(bs => bs.PageId == page.Id)
                .FirstOrDefaultAsync();

            if (blockSchema == null)
            {
                _logger.LogWarning($"No block schema found for page {page.Id}");
                return null;
            }

            return await InitializeSessionFromBlockSchema(projectId, blockSchema, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error starting session: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Инициализирует сессию на основе BlockSchema
    /// </summary>
    private async Task<ChatSessionStartDto?> InitializeSessionFromBlockSchema(int projectId, BlockSchema blockSchema, int? userId)
    {
        try
        {
            _logger.LogInformation($"Initializing session from block schema {blockSchema.Id}");

            // Парсим содержимое блок-схемы
            _logger.LogInformation($"Block schema content length: {blockSchema.Content?.Length ?? 0}");
            
            if (string.IsNullOrEmpty(blockSchema.Content))
            {
                _logger.LogError($"Block schema content is empty for schema {blockSchema.Id}");
                return null;
            }

            var schemaContent = JsonSerializer.Deserialize<BlockSchemaContent>(blockSchema.Content);
            _logger.LogInformation($"Parsed schema content - Blocks count: {schemaContent?.Blocks?.Count ?? 0}");
            
            if (schemaContent == null || schemaContent.Blocks == null || schemaContent.Blocks.Count == 0)
            {
                _logger.LogError($"Invalid block schema content for schema {blockSchema.Id}. Content: {blockSchema.Content}");
                return null;
            }

            // Находим стартовый блок
            var startBlock = schemaContent.Blocks.FirstOrDefault(b => b.Type == "start");
            if (startBlock == null)
            {
                _logger.LogWarning($"No start block found in schema {blockSchema.Id}");
                // Используем первый блок как старт
                startBlock = schemaContent.Blocks.FirstOrDefault();
                if (startBlock == null)
                {
                    _logger.LogError($"No blocks found in schema {blockSchema.Id}");
                    return null;
                }
                _logger.LogInformation($"Using first block as start: {startBlock.Id}");
            }

            // Создаём сессию в БД
            var session = new ChatSession
            {
                ProjectId = projectId,
                UserId = userId,
                CurrentBlockId = startBlock.Id,
                ConversationHistory = "[]",
                IsEnded = false,
                SessionContext = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ChatSessions.Add(session);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Chat session {session.Id} created for project {projectId}");

            // Получаем начальное сообщение (блок, подключённый к start)
            var initialMessage = GetBlockResponse(startBlock, schemaContent);

            return new ChatSessionStartDto
            {
                SessionId = session.Id,
                CurrentBlockId = startBlock.Id,
                InitialMessage = initialMessage
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error initializing session from block schema: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Обрабатывает сообщение или клик кнопки в сессии
    /// </summary>
    public async Task<ChatBlockResponseDto?> ProcessUserInputAsync(int sessionId, ChatMessageDto input)
    {
        try
        {
            // Получаем сессию
            var session = await _context.ChatSessions
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
            {
                _logger.LogWarning($"Chat session {sessionId} not found");
                return null;
            }

            if (session.IsEnded)
            {
                return new ChatBlockResponseDto
                {
                    BlockId = session.CurrentBlockId,
                    BlockType = "terminator",
                    Text = "❌ Conversation has ended. Please start a new session.",
                    IsEnded = true
                };
            }

            // Получаем блок-схему проекта
            var blockSchema = await _context.BlockSchemas
                .Include(bs => bs.Page)
                .FirstOrDefaultAsync(bs => bs.Page != null && bs.Page.ProjectId == session.ProjectId);

            if (blockSchema == null)
            {
                return new ChatBlockResponseDto
                {
                    BlockId = session.CurrentBlockId,
                    BlockType = "error",
                    Text = "❌ Block schema not found",
                    IsEnded = true,
                    Error = "Schema loading failed"
                };
            }

            var schemaContent = JsonSerializer.Deserialize<BlockSchemaContent>(blockSchema.Content);
            if (schemaContent == null)
            {
                return new ChatBlockResponseDto
                {
                    BlockId = session.CurrentBlockId,
                    BlockType = "error",
                    Text = "❌ Failed to parse block schema",
                    IsEnded = true,
                    Error = "Schema parsing failed"
                };
            }

            // Логируем входящее сообщение/кнопку
            if (!string.IsNullOrEmpty(input.Message))
            {
                await LogMessage(session, input.Message, "user");
            }

            // Находим следующий блок
            Block? nextBlock = null;

            if (!string.IsNullOrEmpty(input.SelectedButtonId))
            {
                // Пользователь нажал кнопку - ищем подключённый блок
                var connections = schemaContent.Connections
                    .Where(c => c.FromBlockId == input.SelectedButtonId)
                    .ToList();

                if (connections.Any())
                {
                    nextBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == connections[0].ToBlockId);
                }
            }
            else if (!string.IsNullOrEmpty(input.Message))
            {
                // Текстовое сообщение - пытаемся найти подключённый блок от текущего
                var connections = schemaContent.Connections
                    .Where(c => c.FromBlockId == session.CurrentBlockId)
                    .ToList();

                if (connections.Any())
                {
                    nextBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == connections[0].ToBlockId);
                }
            }

            // Если не нашли блок - используем текущий
            if (nextBlock == null)
            {
                nextBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == session.CurrentBlockId);
            }

            if (nextBlock == null)
            {
                return new ChatBlockResponseDto
                {
                    BlockId = session.CurrentBlockId,
                    BlockType = "error",
                    Text = "❌ Unable to find next block",
                    IsEnded = true,
                    Error = "Navigation failed"
                };
            }

            // Проверяем если это конец
            if (nextBlock.Type == "terminator")
            {
                session.IsEnded = true;
                session.CurrentBlockId = nextBlock.Id;
                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new ChatBlockResponseDto
                {
                    BlockId = nextBlock.Id,
                    BlockType = "terminator",
                    Text = nextBlock.Label ?? "Conversation ended.",
                    IsEnded = true
                };
            }

            // Обновляем текущий блок в сессии
            session.CurrentBlockId = nextBlock.Id;
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Получаем ответ от блока
            var response = GetBlockResponse(nextBlock, schemaContent);
            
            // Логируем ответ
            await LogMessage(session, response.Text, "bot", response.Buttons);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing user input in session {sessionId}: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Получает историю сессии
    /// </summary>
    public async Task<List<ChatMessageHistoryDto>> GetSessionHistoryAsync(int sessionId)
    {
        try
        {
            var session = await _context.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return new();

            var history = JsonSerializer.Deserialize<List<ChatMessageHistoryDto>>(
                session.ConversationHistory,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? new();

            return history;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting session history: {ex.Message}");
            return new();
        }
    }

    /// <summary>
    /// Завершает сессию
    /// </summary>
    public async Task<bool> EndSessionAsync(int sessionId)
    {
        try
        {
            var session = await _context.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;

            session.IsEnded = true;
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Chat session {sessionId} ended");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error ending session: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Очищает историю сессии
    /// </summary>
    public async Task<bool> ClearSessionHistoryAsync(int sessionId)
    {
        try
        {
            var session = await _context.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;

            session.ConversationHistory = "[]";
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Chat session {sessionId} history cleared");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error clearing session history: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Получает блоки, подключённые от текущего блока
    /// </summary>
    private List<Block> GetConnectedBlocks(Block block, BlockSchemaContent schema)
    {
        var connectionIds = schema.Connections
            .Where(c => c.FromBlockId == block.Id)
            .Select(c => c.ToBlockId)
            .ToList();

        return schema.Blocks
            .Where(b => connectionIds.Contains(b.Id))
            .ToList();
    }

    /// <summary>
    /// Формирует ответ для блока (сообщение + кнопки)
    /// </summary>
    private ChatBlockResponseDto GetBlockResponse(Block block, BlockSchemaContent schema)
    {
        var response = new ChatBlockResponseDto
        {
            BlockId = block.Id,
            BlockType = block.Type,
            Text = block.Text ?? block.Label ?? "...",
            IsEnded = false
        };

        // Ищем кнопки в блоке
        var buttons = block.Buttons ?? new();

        // Если это message блок без кнопок, ищем подключённый button_container
        if (block.Type == "message" && buttons.Count == 0)
        {
            var connectedBlocks = GetConnectedBlocks(block, schema);
            var buttonContainer = connectedBlocks.FirstOrDefault(b => b.Type == "button_container");
            
            if (buttonContainer != null)
            {
                buttons = buttonContainer.Buttons ?? new();
            }
        }

        // Конвертируем кнопки в DTO
        foreach (var btn in buttons)
        {
            response.Buttons.Add(new ChatButtonDto
            {
                Id = btn.Id,
                Title = btn.Label,
                Payload = btn.Label
            });
        }

        return response;
    }

    /// <summary>
    /// Логирует сообщение в истории сессии
    /// </summary>
    private async Task LogMessage(ChatSession session, string text, string sender, List<ChatButtonDto>? buttons = null)
    {
        try
        {
            var history = JsonSerializer.Deserialize<List<ChatMessageHistoryDto>>(
                session.ConversationHistory,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? new();

            history.Add(new ChatMessageHistoryDto
            {
                Text = text,
                Sender = sender,
                CreatedAt = DateTime.UtcNow,
                Buttons = buttons
            });

            session.ConversationHistory = JsonSerializer.Serialize(history);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error logging message: {ex.Message}");
        }
    }
}

/// <summary>
/// Структура содержимого блок-схемы (из BlockSchema.Content)
/// </summary>
public class BlockSchemaContent
{
    [JsonPropertyName("blocks")]
    public List<Block> Blocks { get; set; } = new();
    
    [JsonPropertyName("connections")]
    public List<Connection> Connections { get; set; } = new();
}

public class Block
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("label")]
    public string? Label { get; set; }
    
    [JsonPropertyName("text")]
    public string? Text { get; set; }
    
    [JsonPropertyName("buttons")]
    public List<BlockButton>? Buttons { get; set; }
}

public class BlockButton
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
    
    [JsonPropertyName("nextBlockId")]
    public string? NextBlockId { get; set; }
}

public class Connection
{
    [JsonPropertyName("fromBlockId")]
    public string FromBlockId { get; set; } = string.Empty;
    
    [JsonPropertyName("toBlockId")]
    public string ToBlockId { get; set; } = string.Empty;
}
