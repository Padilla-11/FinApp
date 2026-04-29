namespace Finop.API.Models.Entities;

public class CategoriaGasto
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public string Nombre { get; set; } = null!;

    /// <summary>
    /// TRUE = insertada por el sistema al crear el negocio. FALSE = creada por el usuario.
    /// </summary>
    public bool EsPredefinida { get; set; } = false;
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    public Negocio Negocio { get; set; } = null!;
    public ICollection<MovimientoJornada> Movimientos { get; set; } = [];
}
