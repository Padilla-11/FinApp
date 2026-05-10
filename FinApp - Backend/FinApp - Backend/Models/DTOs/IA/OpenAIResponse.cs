using System.Text.Json.Serialization;

namespace Finop.API.Models.DTOs.IA;

public class OpenAIChatResponse
{
    public string Id { get; set; } = null!;
    public string Object { get; set; } = null!;
    public List<OpenAIChoice> Choices { get; set; } = [];
    public OpenAIUsage? Usage { get; set; }
}

public class OpenAIChoice
{
    public int Index { get; set; }
    public OpenAIMessage? Message { get; set; }
    public string? FinishReason { get; set; }
}

public class OpenAIMessage
{
    public string Role { get; set; } = null!;
    public string Content { get; set; } = null!;
    [JsonPropertyName("reasoning_content")]
    public string? ReasoningContent { get; set; }
}

public class OpenAIUsage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
}
