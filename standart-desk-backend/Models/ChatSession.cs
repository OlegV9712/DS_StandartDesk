namespace StandartDesk.Models;

/// <summary>
/// Представляет сессию диалога с чат-ботом
/// </summary>
public class ChatSession
{
    public int Id { get; set; }
    
    /// <summary>
    /// ID проекта (ассистент-бот)
    /// </summary>
    public int ProjectId { get; set; }
    
    /// <summary>
    /// ID пользователя, запустившего сессию
    /// </summary>
    public int? UserId { get; set; }
    
    /// <summary>
    /// ID текущего блока в сценарии
    /// </summary>
    public string CurrentBlockId { get; set; } = string.Empty;
    
    /// <summary>
    /// История диалога (JSON)
    /// </summary>
    public string ConversationHistory { get; set; } = "[]";
    
    /// <summary>
    /// Завершена ли сессия
    /// </summary>
    public bool IsEnded { get; set; }
    
    /// <summary>
    /// Контекст диалога (переменные, параметры)
    /// </summary>
    public string SessionContext { get; set; } = "{}";
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public virtual Project? Project { get; set; }
}
