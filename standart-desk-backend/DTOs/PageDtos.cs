namespace StandartDesk.DTOs;

public class CreatePageDto
{
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; } = 0;
}

public class UpdatePageDto
{
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class ReorderPagesDto
{
    public List<PageOrderItem> Pages { get; set; } = new List<PageOrderItem>();
}

public class PageOrderItem
{
    public int PageId { get; set; }
    public int Order { get; set; }
}
