using System.Text.Json;
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
    public string? Content { get; set; }
    [JsonPropertyName("reasoning_content")]
    public string? ReasoningContent { get; set; }
    [JsonPropertyName("tool_calls")]
    public List<ToolCallItem>? ToolCalls { get; set; }
}

public class ToolCallItem
{
    public string Id { get; set; } = null!;
    public string Type { get; set; } = "function";
    public ToolCallFunction Function { get; set; } = null!;
}

public class ToolCallFunction
{
    public string Name { get; set; } = null!;
    [JsonConverter(typeof(FlexibleStringConverter))]
    public string Arguments { get; set; } = null!;
}

public class FlexibleStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
            return reader.GetString();
        if (reader.TokenType == JsonTokenType.StartObject || reader.TokenType == JsonTokenType.StartArray)
            return JsonDocument.ParseValue(ref reader).RootElement.GetRawText();
        return reader.GetString();
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}

public class OpenAIUsage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
}
