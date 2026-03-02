namespace StandartDesk.DTOs;

/// <summary>
/// DTO для стартовой сессии диалога
/// </summary>
public class ChatSessionStartDto
{
    public int SessionId { get; set; }
    public string CurrentBlockId { get; set; } = string.Empty;
    public ChatBlockResponseDto? InitialMessage { get; set; }
}

/// <summary>
/// DTO для обработки сообщения/кнопки
/// </summary>
public class ChatMessageDto
{
    public string? Message { get; set; }
    public string? SelectedButtonId { get; set; }
}

/// <summary>
/// DTO для ответа блока (сообщение + кнопки)
/// </summary>
public class ChatBlockResponseDto
{
    public string BlockId { get; set; } = string.Empty;
    public string BlockType { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public List<ChatButtonDto> Buttons { get; set; } = new();
    public bool IsEnded { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// DTO для кнопки в диалоге
/// </summary>
public class ChatButtonDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
}

/// <summary>
/// DTO для истории сообщений
/// </summary>
public class ChatMessageHistoryDto
{
    public string Text { get; set; } = string.Empty;
    public string Sender { get; set; } = "bot"; // "bot" или "user"
    public DateTime CreatedAt { get; set; }
    public List<ChatButtonDto>? Buttons { get; set; }
}
