using Finop.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Data;

public class FinopDbContext : DbContext
{
    public FinopDbContext(DbContextOptions<FinopDbContext> options) : base(options) { }

    // DbSets — un DbSet por tabla
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Negocio> Negocios => Set<Negocio>();
    public DbSet<UsuarioNegocio> UsuariosNegocios => Set<UsuarioNegocio>();
    public DbSet<CategoriaProducto> CategoriasProductos => Set<CategoriaProducto>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<CostoFijo> CostosFijos => Set<CostoFijo>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<CategoriaGasto> CategoriasGastos => Set<CategoriaGasto>();
    public DbSet<Jornada> Jornadas => Set<Jornada>();
    public DbSet<MovimientoJornada> MovimientosJornada => Set<MovimientoJornada>();
    public DbSet<VentaCredito> VentasCredito => Set<VentaCredito>();
    public DbSet<CobroCredito> CobrosCredito => Set<CobroCredito>();
    public DbSet<CierreJornada> CierresJornada => Set<CierreJornada>();
    public DbSet<ConteoProductoCierre> ConteosProductosCierre => Set<ConteoProductoCierre>();
    public DbSet<AuditoriaCierre> AuditoriasCierres => Set<AuditoriaCierre>();
    public DbSet<EscenarioSimulacion> EscenariosSimulacion => Set<EscenarioSimulacion>();
    public DbSet<VariableSimulacion> VariablesSimulacion => Set<VariableSimulacion>();
    public DbSet<CacheAnalisis> CacheAnalisis => Set<CacheAnalisis>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 1: USUARIOS Y NEGOCIOS
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("usuarios");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            e.Property(x => x.Correo).HasColumnName("correo").HasMaxLength(255).IsRequired();
            e.Property(x => x.ContrasenaHash).HasColumnName("contrasena_hash").HasMaxLength(255).IsRequired();
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");
            e.HasIndex(x => x.Correo).HasDatabaseName("idx_usuarios_correo").HasFilter("eliminado_en IS NULL");
        });

        modelBuilder.Entity<Negocio>(e =>
        {
            e.ToTable("negocios");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(x => x.TipoActividad).HasColumnName("tipo_actividad").HasMaxLength(100);
            e.Property(x => x.FechaInicio).HasColumnName("fecha_inicio");
            e.Property(x => x.DiasOperacion).HasColumnName("dias_operacion");
            e.Property(x => x.CreadoPor).HasColumnName("creado_por");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.CreadorUsuario)
             .WithMany(u => u.NegociosCreados)
             .HasForeignKey(x => x.CreadoPor)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(x => x.CreadoPor).HasDatabaseName("idx_negocios_creado_por").HasFilter("eliminado_en IS NULL");
        });

        modelBuilder.Entity<UsuarioNegocio>(e =>
        {
            e.ToTable("usuarios_negocios");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Rol).HasColumnName("rol").HasMaxLength(20).IsRequired();
            e.Property(x => x.InvitadoPor).HasColumnName("invitado_por");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasIndex(x => new { x.UsuarioId, x.NegocioId }).IsUnique();

            e.HasOne(x => x.Usuario).WithMany(u => u.UsuariosNegocios).HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany(n => n.UsuariosNegocios).HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.InvitadoPorUsuario).WithMany().HasForeignKey(x => x.InvitadoPor).OnDelete(DeleteBehavior.Restrict);
        });

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 2: CONFIGURACIÓN DEL NEGOCIO
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<CategoriaProducto>(e =>
        {
            e.ToTable("categorias_productos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Producto>(e =>
        {
            e.ToTable("productos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.CategoriaId).HasColumnName("categoria_id");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(x => x.PrecioVenta).HasColumnName("precio_venta").HasColumnType("numeric(12,2)");
            e.Property(x => x.CostoUnitario).HasColumnName("costo_unitario").HasColumnType("numeric(12,2)");
            e.Property(x => x.MargenPorcentaje).HasColumnName("margen_porcentaje").HasColumnType("numeric(5,2)")
             .ValueGeneratedOnAddOrUpdate(); // columna GENERATED de PostgreSQL
            e.Property(x => x.Activo).HasColumnName("activo");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany(n => n.Productos).HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Categoria).WithMany(c => c.Productos).HasForeignKey(x => x.CategoriaId).OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(x => x.NegocioId).HasDatabaseName("idx_productos_negocio").HasFilter("eliminado_en IS NULL");
        });

        modelBuilder.Entity<CostoFijo>(e =>
        {
            e.ToTable("costos_fijos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(x => x.Valor).HasColumnName("valor").HasColumnType("numeric(12,2)");
            e.Property(x => x.Frecuencia).HasColumnName("frecuencia").HasMaxLength(10).IsRequired();
            e.Property(x => x.EquivalenteDiario).HasColumnName("equivalente_diario").HasColumnType("numeric(12,2)");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany(n => n.CostosFijos).HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Empleado>(e =>
        {
            e.ToTable("empleados");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(x => x.Cargo).HasColumnName("cargo").HasMaxLength(100);
            e.Property(x => x.TipoPago).HasColumnName("tipo_pago").HasMaxLength(10).IsRequired();
            e.Property(x => x.ValorPago).HasColumnName("valor_pago").HasColumnType("numeric(12,2)");
            e.Property(x => x.CostoDiario).HasColumnName("costo_diario").HasColumnType("numeric(12,2)");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany(n => n.Empleados).HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CategoriaGasto>(e =>
        {
            e.ToTable("categorias_gastos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            e.Property(x => x.EsPredefinida).HasColumnName("es_predefinida");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
        });

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 3: JORNADA OPERATIVA
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<Jornada>(e =>
        {
            e.ToTable("jornadas");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.AbiertaPor).HasColumnName("abierta_por");
            e.Property(x => x.FechaReferencia).HasColumnName("fecha_referencia");
            e.Property(x => x.CajaInicial).HasColumnName("caja_inicial").HasColumnType("numeric(12,2)");
            e.Property(x => x.NotaApertura).HasColumnName("nota_apertura");
            e.Property(x => x.AbiertaEn).HasColumnName("abierta_en");
            e.Property(x => x.CerradaEn).HasColumnName("cerrada_en");
            e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(10);

            // Única jornada por negocio por fecha
            e.HasIndex(x => new { x.NegocioId, x.FechaReferencia }).IsUnique();

            e.HasOne(x => x.Negocio).WithMany(n => n.Jornadas).HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.AbiertaPorUsuario).WithMany().HasForeignKey(x => x.AbiertaPor).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MovimientoJornada>(e =>
        {
            e.ToTable("movimientos_jornada");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.JornadaId).HasColumnName("jornada_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(25).IsRequired();
            e.Property(x => x.CategoriaGastoId).HasColumnName("categoria_gasto_id");
            e.Property(x => x.Descripcion).HasColumnName("descripcion").HasMaxLength(255).IsRequired();
            e.Property(x => x.Monto).HasColumnName("monto").HasColumnType("numeric(12,2)");
            e.Property(x => x.AfectaCaja).HasColumnName("afecta_caja");
            e.Property(x => x.SignoCaja).HasColumnName("signo_caja");
            e.Property(x => x.Nota).HasColumnName("nota");
            e.Property(x => x.RegistradoPor).HasColumnName("registrado_por");
            e.Property(x => x.RegistradoEn).HasColumnName("registrado_en");

            e.HasOne(x => x.Jornada).WithMany(j => j.Movimientos).HasForeignKey(x => x.JornadaId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CategoriaGasto).WithMany(c => c.Movimientos).HasForeignKey(x => x.CategoriaGastoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.RegistradoPorUsuario).WithMany().HasForeignKey(x => x.RegistradoPor).OnDelete(DeleteBehavior.Restrict);
        });

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 4: CUENTAS POR COBRAR
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<VentaCredito>(e =>
        {
            e.ToTable("ventas_credito");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.JornadaId).HasColumnName("jornada_id");
            e.Property(x => x.RegistradoPor).HasColumnName("registrado_por");
            e.Property(x => x.NombreCliente).HasColumnName("nombre_cliente").HasMaxLength(150).IsRequired();
            e.Property(x => x.Descripcion).HasColumnName("descripcion").HasMaxLength(255);
            e.Property(x => x.MontoTotal).HasColumnName("monto_total").HasColumnType("numeric(12,2)");
            e.Property(x => x.MontoCobrado).HasColumnName("monto_cobrado").HasColumnType("numeric(12,2)");
            e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(20);
            e.Property(x => x.FechaRegistro).HasColumnName("fecha_registro");
            e.Property(x => x.Nota).HasColumnName("nota");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");

            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Jornada).WithMany(j => j.VentasCredito).HasForeignKey(x => x.JornadaId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RegistradoPorUsuario).WithMany().HasForeignKey(x => x.RegistradoPor).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CobroCredito>(e =>
        {
            e.ToTable("cobros_credito");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.VentaCreditoId).HasColumnName("venta_credito_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.JornadaId).HasColumnName("jornada_id");
            e.Property(x => x.MovimientoId).HasColumnName("movimiento_id");
            e.Property(x => x.MontoCobrado).HasColumnName("monto_cobrado").HasColumnType("numeric(12,2)");
            e.Property(x => x.RegistradoPor).HasColumnName("registrado_por");
            e.Property(x => x.RegistradoEn).HasColumnName("registrado_en");
            e.Property(x => x.Nota).HasColumnName("nota");

            e.HasOne(x => x.VentaCredito).WithMany(v => v.Cobros).HasForeignKey(x => x.VentaCreditoId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Jornada).WithMany().HasForeignKey(x => x.JornadaId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Movimiento).WithOne(m => m.CobroCredito).HasForeignKey<CobroCredito>(x => x.MovimientoId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RegistradoPorUsuario).WithMany().HasForeignKey(x => x.RegistradoPor).OnDelete(DeleteBehavior.Restrict);
        });

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 5: CIERRE DE JORNADA
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<CierreJornada>(e =>
        {
            e.ToTable("cierres_jornada");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.JornadaId).HasColumnName("jornada_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.CerradoPor).HasColumnName("cerrado_por");
            e.Property(x => x.CajaInicial).HasColumnName("caja_inicial").HasColumnType("numeric(12,2)");
            e.Property(x => x.CajaFinalRegistrada).HasColumnName("caja_final_registrada").HasColumnType("numeric(12,2)");
            e.Property(x => x.CajaEsperada).HasColumnName("caja_esperada").HasColumnType("numeric(12,2)");
            e.Property(x => x.DiferenciaCaja).HasColumnName("diferencia_caja").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.IngresosOperativos).HasColumnName("ingresos_operativos").HasColumnType("numeric(12,2)");
            e.Property(x => x.CostoVendido).HasColumnName("costo_vendido").HasColumnType("numeric(12,2)");
            e.Property(x => x.UtilidadBruta).HasColumnName("utilidad_bruta").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.GastosJornada).HasColumnName("gastos_jornada").HasColumnType("numeric(12,2)");
            e.Property(x => x.CostosFijosDia).HasColumnName("costos_fijos_dia").HasColumnType("numeric(12,2)");
            e.Property(x => x.UtilidadNeta).HasColumnName("utilidad_neta").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.MargenGanancia).HasColumnName("margen_ganancia").HasColumnType("numeric(5,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.PuntoEquilibrioDia).HasColumnName("punto_equilibrio_dia").HasColumnType("numeric(12,2)");
            e.Property(x => x.EstadoDia).HasColumnName("estado_dia").HasMaxLength(15);
            e.Property(x => x.ConteoRealizado).HasColumnName("conteo_realizado");
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");

            e.HasOne(x => x.Jornada).WithOne(j => j.Cierre).HasForeignKey<CierreJornada>(x => x.JornadaId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CerradoPorUsuario).WithMany().HasForeignKey(x => x.CerradoPor).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ConteoProductoCierre>(e =>
        {
            e.ToTable("conteo_productos_cierre");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.CierreId).HasColumnName("cierre_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.ProductoId).HasColumnName("producto_id");
            e.Property(x => x.UnidadesVendidas).HasColumnName("unidades_vendidas");
            e.Property(x => x.PrecioVenta).HasColumnName("precio_venta").HasColumnType("numeric(12,2)");
            e.Property(x => x.CostoUnitario).HasColumnName("costo_unitario").HasColumnType("numeric(12,2)");
            e.Property(x => x.SubtotalIngresos).HasColumnName("subtotal_ingresos").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.SubtotalCosto).HasColumnName("subtotal_costo").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.SubtotalUtilidad).HasColumnName("subtotal_utilidad").HasColumnType("numeric(12,2)").ValueGeneratedOnAddOrUpdate();

            e.HasIndex(x => new { x.CierreId, x.ProductoId }).IsUnique();

            e.HasOne(x => x.Cierre).WithMany(c => c.Conteos).HasForeignKey(x => x.CierreId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Producto).WithMany(p => p.ConteosCierre).HasForeignKey(x => x.ProductoId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditoriaCierre>(e =>
        {
            e.ToTable("auditoria_cierres");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.CierreId).HasColumnName("cierre_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.ModificadoPor).HasColumnName("modificado_por");
            e.Property(x => x.Justificacion).HasColumnName("justificacion").IsRequired();
            e.Property(x => x.ValoresAnteriores).HasColumnName("valores_anteriores").HasColumnType("jsonb");
            e.Property(x => x.ValoresNuevos).HasColumnName("valores_nuevos").HasColumnType("jsonb");
            e.Property(x => x.ModificadoEn).HasColumnName("modificado_en");

            e.HasOne(x => x.Cierre).WithMany(c => c.Auditorias).HasForeignKey(x => x.CierreId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ModificadoPorUsuario).WithMany().HasForeignKey(x => x.ModificadoPor).OnDelete(DeleteBehavior.Restrict);
        });

        // ─────────────────────────────────────────────────────────────
        // MÓDULO 6: SIMULADOR FINANCIERO
        // ─────────────────────────────────────────────────────────────

        modelBuilder.Entity<EscenarioSimulacion>(e =>
        {
            e.ToTable("escenarios_simulacion");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.CreadoPor).HasColumnName("creado_por");
            e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(x => x.Descripcion).HasColumnName("descripcion");
            e.Property(x => x.PeriodoBaseInicio).HasColumnName("periodo_base_inicio");
            e.Property(x => x.PeriodoBaseFin).HasColumnName("periodo_base_fin");
            e.Property(x => x.IngresosDiariosActual).HasColumnName("ingresos_diarios_actual").HasColumnType("numeric(12,2)");
            e.Property(x => x.UtilidadNetaActual).HasColumnName("utilidad_neta_actual").HasColumnType("numeric(12,2)");
            e.Property(x => x.MargenActual).HasColumnName("margen_actual").HasColumnType("numeric(5,2)");
            e.Property(x => x.EquilibrioActual).HasColumnName("equilibrio_actual").HasColumnType("numeric(12,2)");
            e.Property(x => x.IngresosDiariosSimulado).HasColumnName("ingresos_diarios_simulado").HasColumnType("numeric(12,2)");
            e.Property(x => x.UtilidadNetaSimulado).HasColumnName("utilidad_neta_simulado").HasColumnType("numeric(12,2)");
            e.Property(x => x.MargenSimulado).HasColumnName("margen_simulado").HasColumnType("numeric(5,2)");
            e.Property(x => x.EquilibrioSimulado).HasColumnName("equilibrio_simulado").HasColumnType("numeric(12,2)");
            e.Property(x => x.VariacionIngresos).HasColumnName("variacion_ingresos").HasColumnType("numeric(5,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.VariacionUtilidad).HasColumnName("variacion_utilidad").HasColumnType("numeric(5,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");
            e.Property(x => x.ActualizadoEn).HasColumnName("actualizado_en");
            e.Property(x => x.EliminadoEn).HasColumnName("eliminado_en");

            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreadoPorUsuario).WithMany().HasForeignKey(x => x.CreadoPor).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VariableSimulacion>(e =>
        {
            e.ToTable("variables_simulacion");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.EscenarioId).HasColumnName("escenario_id");
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.TipoVariable).HasColumnName("tipo_variable").HasMaxLength(25).IsRequired();
            e.Property(x => x.ProductoId).HasColumnName("producto_id");
            e.Property(x => x.CostoFijoId).HasColumnName("costo_fijo_id");
            e.Property(x => x.ValorActual).HasColumnName("valor_actual").HasColumnType("numeric(12,2)");
            e.Property(x => x.ValorSimulado).HasColumnName("valor_simulado").HasColumnType("numeric(12,2)");
            e.Property(x => x.VariacionPct).HasColumnName("variacion_pct").HasColumnType("numeric(5,2)").ValueGeneratedOnAddOrUpdate();
            e.Property(x => x.CreadoEn).HasColumnName("creado_en");

            e.HasOne(x => x.Escenario).WithMany(s => s.Variables).HasForeignKey(x => x.EscenarioId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Producto).WithMany().HasForeignKey(x => x.ProductoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CostoFijo).WithMany().HasForeignKey(x => x.CostoFijoId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CacheAnalisis>(e =>
        {
            e.ToTable("cache_analisis");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            e.Property(x => x.NegocioId).HasColumnName("negocio_id");
            e.Property(x => x.Dias).HasColumnName("dias");
            e.Property(x => x.PeriodoInicio).HasColumnName("periodo_inicio");
            e.Property(x => x.PeriodoFin).HasColumnName("periodo_fin");
            e.Property(x => x.JornadasBase).HasColumnName("jornadas_base");
            e.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(64).IsRequired();
            e.Property(x => x.PayloadEnviado).HasColumnName("payload_enviado").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Resultado).HasColumnName("resultado").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.GeneradoEn).HasColumnName("generado_en");

            e.HasOne(x => x.Negocio).WithMany().HasForeignKey(x => x.NegocioId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.NegocioId, x.Dias, x.IdempotencyKey }).IsUnique();
            e.HasIndex(x => new { x.NegocioId, x.Dias, x.GeneradoEn }).HasDatabaseName("idx_cache_analisis_negocio");
        });
    }
}
