namespace Finop.API.Models.Entities;

public class CategoriaProducto
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public string Nombre { get; set; } = null!;
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    public Negocio Negocio { get; set; } = null!;
    public ICollection<Producto> Productos { get; set; } = [];
}
