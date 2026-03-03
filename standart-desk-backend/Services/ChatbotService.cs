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
            _logger.LogInformation($"Parsed schema content - Connections count: {schemaContent?.Connections?.Count ?? 0}");
            
            if (schemaContent?.Blocks != null)
            {
                foreach (var block in schemaContent.Blocks.Take(5)) // Логируем первых 5 блоков
                {
                    _logger.LogInformation($"  Block: id={block.Id}, type={block.Type}, text={block.Text}");
                }
            }
            
            if (schemaContent?.Connections != null)
            {
                foreach (var conn in schemaContent.Connections.Take(5)) // Логируем первых 5 connections
                {
                    _logger.LogInformation($"  Connection: {conn.FromBlockId} -> {conn.ToBlockId}");
                }
            }
            
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
            // Сохраняем скомпилированный контент в SessionContext, чтобы не парсить JSON каждый раз
            var sessionContext = new
            {
                CompiledContent = schemaContent,
                BuildTime = DateTime.UtcNow,
                BlockHistory = new List<string> { startBlock.Id }  // История посещённых блоков
            };

            var session = new ChatSession
            {
                ProjectId = projectId,
                UserId = userId,
                CurrentBlockId = startBlock.Id,
                ConversationHistory = "[]",
                IsEnded = false,
                SessionContext = JsonSerializer.Serialize(sessionContext),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ChatSessions.Add(session);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Chat session {session.Id} created for project {projectId}");
            _logger.LogInformation($"START BLOCK DEBUG: startBlock.Id={startBlock.Id}, startBlock.Type={startBlock.Type}, startBlock.Label={startBlock.Label}");

            // НЕ переходим автоматически от start блока
            // Start блок должен быть кнопкой, которую пользователь нажимает
            var responseBlock = startBlock;
            _logger.LogInformation($"START BLOCK DEBUG: responseBlock set to {responseBlock.Id}");
            
            // Получаем начальное сообщение
            var initialMessage = GetBlockResponse(responseBlock, schemaContent);
            
            _logger.LogInformation($"START BLOCK DEBUG: Got initialMessage - BlockId={initialMessage?.BlockId}, BlockType={initialMessage?.BlockType}, Buttons={initialMessage?.Buttons?.Count}");
            
            // Обновляем session если изменился текущий блок
            if (session.CurrentBlockId != startBlock.Id)
            {
                _context.ChatSessions.Update(session);
                await _context.SaveChangesAsync();
            }

            return new ChatSessionStartDto
            {
                SessionId = session.Id,
                CurrentBlockId = responseBlock.Id,
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

            // Получаем скомпилированный контент из сессии (сохранён при инициализации)
            BlockSchemaContent? schemaContent = null;
            
            try
            {
                var sessionContextJson = JsonSerializer.Deserialize<JsonElement>(session.SessionContext ?? "{}");
                if (sessionContextJson.TryGetProperty("CompiledContent", out var compiledContentElement))
                {
                    schemaContent = JsonSerializer.Deserialize<BlockSchemaContent>(compiledContentElement.GetRawText()) ?? null;
                    _logger.LogInformation($"Using compiled content from session {sessionId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to get compiled content from session, will try to load from BlockSchema: {ex.Message}");
            }

            // Fallback: если по какой-то причине контента нет в сессии, загружаем с диска
            if (schemaContent == null)
            {
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

                schemaContent = JsonSerializer.Deserialize<BlockSchemaContent>(blockSchema.Content ?? "{}");
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
            }

            // Логируем входящее сообщение/кнопку
            if (!string.IsNullOrEmpty(input.Message))
            {
                await LogMessage(session, input.Message, "user");
            }

            // Находим следующий блок
            Block? nextBlock = null;

            // Проверяем команду "back" для возврата на шаг назад
            if (!string.IsNullOrEmpty(input.Message) && (input.Message.ToLower() == "back" || input.Message.ToLower() == "назад"))
            {
                _logger.LogInformation($"SESSION {sessionId}: User requested to go back");
                
                // Получаем историю блоков из SessionContext
                try
                {
                    var sessionContextJson = JsonSerializer.Deserialize<JsonElement>(session.SessionContext ?? "{}");
                    if (sessionContextJson.TryGetProperty("BlockHistory", out var historyElement))
                    {
                        var blockHistory = JsonSerializer.Deserialize<List<string>>(historyElement.GetRawText()) ?? new List<string>();
                        
                        if (blockHistory.Count > 1)
                        {
                            // Удаляем текущий блок из истории
                            blockHistory.RemoveAt(blockHistory.Count - 1);
                            var previousBlockId = blockHistory[blockHistory.Count - 1];
                            
                            _logger.LogInformation($"SESSION {sessionId}: Going back to block {previousBlockId}");
                            nextBlock = schemaContent!.Blocks.FirstOrDefault(b => b.Id == previousBlockId);
                            
                            // Обновляем историю в SessionContext
                            var updatedContext = new { CompiledContent = schemaContent, BuildTime = DateTime.UtcNow, BlockHistory = blockHistory };
                            session.SessionContext = JsonSerializer.Serialize(updatedContext);
                        }
                        else
                        {
                            _logger.LogInformation($"SESSION {sessionId}: Already at the beginning of scenario");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"SESSION {sessionId}: Failed to process back command: {ex.Message}");
                }
                
                // Если не удалось вернуться, используем текущий блок
                if (nextBlock == null)
                {
                    nextBlock = schemaContent?.Blocks.FirstOrDefault(b => b.Id == session.CurrentBlockId);
                }
            }
            else if (!string.IsNullOrEmpty(input.SelectedButtonId))
            {
                // Пользователь нажал кнопку - ищем подключённый блок
                _logger.LogInformation($"USER CLICKED BUTTON: buttonId={input.SelectedButtonId}");
                
                // Сначала проверяем - может быть это direct block ID (для start блока)
                var directBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == input.SelectedButtonId);
                if (directBlock != null)
                {
                    _logger.LogInformation($"BUTTON TRANSITION: Direct block found - {directBlock.Id} (type={directBlock.Type})");
                    nextBlock = directBlock;
                }
                else
                {
                    // Ищем connections от ID КНОПКИ (приоритет!)
                    var buttonConnections = schemaContent.Connections
                        .Where(c => c.FromButtonId == input.SelectedButtonId)
                        .ToList();

                    _logger.LogInformation($"BUTTON TRANSITION: Searching connections from button {input.SelectedButtonId}, found {buttonConnections.Count}");
                    
                    if (buttonConnections.Any())
                    {
                        nextBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == buttonConnections[0].ToBlockId);
                        _logger.LogInformation($"BUTTON TRANSITION: Connected block - {nextBlock?.Id}");
                    }
                    else
                    {
                        // Fallback: ищем connections по FromBlockId (для старой схемы без fromButtonId)
                        var blockConnections = schemaContent.Connections
                            .Where(c => c.FromBlockId == input.SelectedButtonId)
                            .ToList();

                        _logger.LogInformation($"BUTTON TRANSITION (fallback BlockId): Searching connections from {input.SelectedButtonId}, found {blockConnections.Count}");
                        
                        if (blockConnections.Any())
                        {
                            nextBlock = schemaContent.Blocks.FirstOrDefault(b => b.Id == blockConnections[0].ToBlockId);
                            _logger.LogInformation($"BUTTON TRANSITION (fallback): Connected block - {nextBlock?.Id}");
                        }
                    }
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
                nextBlock = schemaContent?.Blocks.FirstOrDefault(b => b.Id == session.CurrentBlockId);
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
            
            // Обновляем историю блоков если это новый блок (не back)
            if (nextBlock.Id != session.CurrentBlockId || input.SelectedButtonId != null)
            {
                try
                {
                    var sessionContextJson = JsonSerializer.Deserialize<JsonElement>(session.SessionContext ?? "{}");
                    if (sessionContextJson.TryGetProperty("BlockHistory", out var historyElement))
                    {
                        var blockHistory = JsonSerializer.Deserialize<List<string>>(historyElement.GetRawText()) ?? new List<string>();
                        if (!blockHistory.Contains(nextBlock.Id))
                        {
                            blockHistory.Add(nextBlock.Id);
                            var updatedContext = new { CompiledContent = schemaContent, BuildTime = DateTime.UtcNow, BlockHistory = blockHistory };
                            session.SessionContext = JsonSerializer.Serialize(updatedContext);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"SESSION {sessionId}: Failed to update block history: {ex.Message}");
                }
            }
            
            await _context.SaveChangesAsync();

            // Получаем ответ от блока (schemaContent не может быть null после fallback)
            var response = GetBlockResponse(nextBlock, schemaContent!);
            
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
        _logger.LogInformation($"GetConnectedBlocks for block {block.Id}");
        _logger.LogInformation($"Total connections in schema: {schema.Connections.Count}");
        _logger.LogInformation($"Total blocks in schema: {schema.Blocks.Count}");
        
        var connectionIds = schema.Connections
            .Where(c => c.FromBlockId == block.Id)
            .Select(c => c.ToBlockId)
            .ToList();

        _logger.LogInformation($"Found {connectionIds.Count} connection IDs from block {block.Id}:");
        foreach (var connId in connectionIds)
        {
            _logger.LogInformation($"  -> {connId}");
        }

        var result = schema.Blocks
            .Where(b => connectionIds.Contains(b.Id))
            .ToList();
            
        _logger.LogInformation($"Resolved to {result.Count} actual blocks");
        foreach (var b in result)
        {
            _logger.LogInformation($"  Block: {b.Id} (type: {b.Type})");
        }
        
        return result;
    }

    /// <summary>
    /// Формирует ответ для блока (сообщение + кнопки)
    /// </summary>
    private ChatBlockResponseDto GetBlockResponse(Block block, BlockSchemaContent schema)
    {
        _logger.LogInformation($"GetBlockResponse for block {block.Id}, type: {block.Type}");
        
        var response = new ChatBlockResponseDto
        {
            BlockId = block.Id,
            BlockType = block.Type,
            Text = block.Type == "start" ? (block.Label ?? "Start Scenario") : (block.Text ?? block.Label ?? "..."),
            IsEnded = false
        };

        // Ищем кнопки в блоке
        var buttons = block.Buttons ?? new();
        _logger.LogInformation($"Block {block.Id} has {buttons.Count} inline buttons");

        // Если это start блок, ищем connected блоки и создаём для них кнопки
        if (block.Type == "start")
        {
            _logger.LogInformation($"START BLOCK LOGIC: Detected start block {block.Id}");
            
            var connectedBlocks = GetConnectedBlocks(block, schema);
            _logger.LogInformation($"START BLOCK: Found {connectedBlocks.Count} connected blocks");
            
            // START блок показываем как одну кнопку "НАЧАЛО", которая ведёт на первый connected блок
            if (connectedBlocks.Count > 0)
            {
                var firstConnectedBlock = connectedBlocks[0];
                response.Buttons.Add(new ChatButtonDto
                {
                    Id = firstConnectedBlock.Id,  // Кнопка ведёт на первый connected блок!
                    Title = block.Label ?? "НАЧАЛО",
                    Payload = block.Label ?? "НАЧАЛО"
                });
                _logger.LogInformation($"START BLOCK: Created button pointing to {firstConnectedBlock.Id}");
            }
            
            // START блок - не показываем текст, только кнопку
            response.Text = "";
            
            _logger.LogInformation($"START BLOCK RESULT: Returning {response.Buttons.Count} button(s)");
            return response;
        }

        // Если это message блок без кнопок, ищем подключённый button_container
        if (block.Type == "message" && buttons.Count == 0)
        {
            _logger.LogInformation($"Message block {block.Id} without inline buttons, searching for button_container");
            var connectedBlocks = GetConnectedBlocks(block, schema);
            _logger.LogInformation($"Found {connectedBlocks.Count} connected blocks for message {block.Id}");
            
            foreach (var cb in connectedBlocks)
            {
                _logger.LogInformation($"  Connected: {cb.Id}, type={cb.Type}, buttons={cb.Buttons?.Count ?? 0}");
                if (cb.Type == "button_container" && cb.Buttons != null)
                {
                    foreach (var b in cb.Buttons)
                    {
                        _logger.LogInformation($"    - Button: {b.Label} (id: {b.Id})");
                    }
                }
            }
            
            var buttonContainer = connectedBlocks.FirstOrDefault(b => b.Type == "button_container");
            
            if (buttonContainer != null)
            {
                _logger.LogInformation($"Found button_container {buttonContainer.Id} for message {block.Id}");
                _logger.LogInformation($"  button_container.Buttons is null: {buttonContainer.Buttons == null}");
                _logger.LogInformation($"  button_container.Buttons count: {buttonContainer.Buttons?.Count ?? 0}");
                
                if (buttonContainer.Buttons != null && buttonContainer.Buttons.Count > 0)
                {
                    buttons = buttonContainer.Buttons;
                    _logger.LogInformation($"✓ Using {buttons.Count} buttons from container");
                }
                else
                {
                    _logger.LogWarning($"✗ button_container {buttonContainer.Id} is empty");
                }
            }
            else
            {
                _logger.LogWarning($"✗ No button_container found. Available types: {string.Join(", ", connectedBlocks.Select(b => b.Type))}");
            }
        }

        // Конвертируем кнопки в DTO
        foreach (var btn in buttons)
        {
            _logger.LogInformation($"Adding button: {btn.Label} (id: {btn.Id})");
            response.Buttons.Add(new ChatButtonDto
            {
                Id = btn.Id,
                Title = btn.Label,
                Payload = btn.Label
            });
        }

        _logger.LogInformation($"Response for block {block.Id}: {response.Buttons.Count} buttons");
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
    
    [JsonPropertyName("label")]
    public string? Label { get; set; }
    
    [JsonPropertyName("fromButtonId")]
    public string? FromButtonId { get; set; }  // ID кнопки если соединение от кнопки
}
