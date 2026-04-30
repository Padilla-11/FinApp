namespace Finop.API.Models.DTOs;

public class ApiResponse<T>
{
    public bool Exito { get; set; }
    public string? Mensaje { get; set; }
    public T? Data { get; set; }
    public List<string> Errores { get; set; } = [];

    public static ApiResponse<T> Ok(T data, string? mensaje = null) =>
        new() { Exito = true, Data = data, Mensaje = mensaje };

    public static ApiResponse<T> Fallo(string mensaje, List<string>? errores = null) =>
        new() { Exito = false, Mensaje = mensaje, Errores = errores ?? [] };
}

public class PaginadoResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalItems { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}
