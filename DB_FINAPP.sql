-- =====================================================================
-- FINOP — Sistema Web de Análisis Financiero para Microempresas
-- Base de datos PostgreSQL
-- Versión 1.0 — 2025
-- =====================================================================
-- Orden de ejecución:
--   1. Extensiones
--   2. Módulo 1: Usuarios y negocios
--   3. Módulo 2: Configuración del negocio
--   4. Módulo 3: Jornada operativa
--   5. Módulo 4: Cuentas por cobrar
--   6. Módulo 5: Cierre de jornada
--   7. Módulo 6: Simulador financiero
--   8. Triggers y funciones
-- =====================================================================


-- =====================================================================
-- EXTENSIONES
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Útil para búsquedas de texto en nombres de productos y clientes


-- =====================================================================
-- MÓDULO 1: USUARIOS Y NEGOCIOS
-- =====================================================================

CREATE TABLE usuarios (
    id                  BIGSERIAL       PRIMARY KEY,
    nombre              VARCHAR(100)    NOT NULL,
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    contrasena_hash     VARCHAR(255)    NOT NULL,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  usuarios                  IS 'Usuarios registrados en el sistema';
COMMENT ON COLUMN usuarios.contrasena_hash  IS 'Hash BCrypt de la contraseña. Nunca se almacena en texto plano';
COMMENT ON COLUMN usuarios.eliminado_en     IS 'Soft delete. NULL = activo';

-- -------------------------------------------------------------------

CREATE TABLE negocios (
    id                  BIGSERIAL       PRIMARY KEY,
    nombre              VARCHAR(150)    NOT NULL,
    tipo_actividad      VARCHAR(100)    NULL,
    fecha_inicio        DATE            NOT NULL,
    dias_operacion      SMALLINT[]      NOT NULL,
    creado_por          BIGINT          NOT NULL REFERENCES usuarios(id),
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  negocios               IS 'Negocios registrados en el sistema. Un usuario puede tener varios';
COMMENT ON COLUMN negocios.dias_operacion IS 'Array de días operativos: 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb 7=Dom';

-- -------------------------------------------------------------------

CREATE TABLE usuarios_negocios (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    rol                 VARCHAR(20)     NOT NULL CHECK (rol IN ('propietario', 'operador')),
    invitado_por        BIGINT          NULL REFERENCES usuarios(id),
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL,
    UNIQUE (usuario_id, negocio_id)
);

COMMENT ON TABLE  usuarios_negocios             IS 'Relación entre usuarios y negocios con rol asignado';
COMMENT ON COLUMN usuarios_negocios.rol         IS 'propietario: acceso total. operador: solo registra jornadas';
COMMENT ON COLUMN usuarios_negocios.invitado_por IS 'ID del propietario que otorgó el acceso';
COMMENT ON COLUMN usuarios_negocios.eliminado_en IS 'Soft delete. NULL = acceso activo';

-- -------------------------------------------------------------------
-- Índices módulo 1

CREATE INDEX idx_usuarios_correo
    ON usuarios (correo)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_negocios_creado_por
    ON negocios (creado_por)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_usuarios_negocios_usuario
    ON usuarios_negocios (usuario_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_usuarios_negocios_negocio
    ON usuarios_negocios (negocio_id)
    WHERE eliminado_en IS NULL;


-- =====================================================================
-- MÓDULO 2: CONFIGURACIÓN DEL NEGOCIO
-- =====================================================================

CREATE TABLE categorias_productos (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    nombre              VARCHAR(100)    NOT NULL,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE categorias_productos IS 'Categorías para clasificar los productos del negocio';

-- -------------------------------------------------------------------

CREATE TABLE productos (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    categoria_id        BIGINT          NULL REFERENCES categorias_productos(id),
    nombre              VARCHAR(150)    NOT NULL,
    precio_venta        NUMERIC(12,2)   NOT NULL CHECK (precio_venta > 0),
    costo_unitario      NUMERIC(12,2)   NOT NULL CHECK (costo_unitario >= 0),
    margen_porcentaje   NUMERIC(5,2)    GENERATED ALWAYS AS (
                            ROUND(((precio_venta - costo_unitario) / precio_venta) * 100, 2)
                        ) STORED,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  productos                  IS 'Productos o servicios ofrecidos por el negocio';
COMMENT ON COLUMN productos.costo_unitario   IS 'Costo definido por el propietario. Incluye insumos, empaques y lo que considere';
COMMENT ON COLUMN productos.margen_porcentaje IS 'Columna generada automáticamente por PostgreSQL';
COMMENT ON COLUMN productos.activo           IS 'FALSE = producto desactivado temporalmente sin eliminarlo';
COMMENT ON COLUMN productos.eliminado_en     IS 'Soft delete. Registros usados en cierres no se borran físicamente';

-- -------------------------------------------------------------------

CREATE TABLE costos_fijos (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    nombre              VARCHAR(150)    NOT NULL,
    valor               NUMERIC(12,2)   NOT NULL CHECK (valor > 0),
    frecuencia          VARCHAR(10)     NOT NULL CHECK (frecuencia IN ('diaria', 'semanal', 'mensual')),
    equivalente_diario  NUMERIC(12,2)   NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  costos_fijos                 IS 'Costos fijos periódicos del negocio (arriendo, servicios, etc.)';
COMMENT ON COLUMN costos_fijos.equivalente_diario IS 'Calculado por el backend (C#) usando los días operativos del negocio. Fórmula: mensual = valor / (días_semana × 4.33)';

-- -------------------------------------------------------------------

CREATE TABLE empleados (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    nombre              VARCHAR(150)    NOT NULL,
    cargo               VARCHAR(100)    NULL,
    tipo_pago           VARCHAR(10)     NOT NULL CHECK (tipo_pago IN ('diario', 'semanal', 'mensual')),
    valor_pago          NUMERIC(12,2)   NOT NULL CHECK (valor_pago > 0),
    costo_diario        NUMERIC(12,2)   NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  empleados            IS 'Empleados del negocio. Su costo diario se suma a los costos fijos del cierre';
COMMENT ON COLUMN empleados.costo_diario IS 'Calculado por el backend (C#) usando los días operativos del negocio. Fórmula: mensual = valor / (días_semana × 4.33)';

-- -------------------------------------------------------------------

CREATE TABLE categorias_gastos (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    nombre              VARCHAR(100)    NOT NULL,
    es_predefinida      BOOLEAN         NOT NULL DEFAULT FALSE,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en        TIMESTAMPTZ     NULL
);

COMMENT ON TABLE  categorias_gastos               IS 'Categorías para clasificar los gastos operativos de la jornada';
COMMENT ON COLUMN categorias_gastos.es_predefinida IS 'TRUE = insertada por el sistema al crear el negocio. FALSE = creada por el usuario';

-- -------------------------------------------------------------------
-- Índices módulo 2

CREATE INDEX idx_productos_negocio
    ON productos (negocio_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_productos_categoria
    ON productos (categoria_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_costos_fijos_negocio
    ON costos_fijos (negocio_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_empleados_negocio
    ON empleados (negocio_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_categorias_gastos_negocio
    ON categorias_gastos (negocio_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_categorias_productos_negocio
    ON categorias_productos (negocio_id)
    WHERE eliminado_en IS NULL;


-- =====================================================================
-- MÓDULO 3: JORNADA OPERATIVA
-- =====================================================================

CREATE TABLE jornadas (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    abierta_por         BIGINT          NOT NULL REFERENCES usuarios(id),
    fecha_referencia    DATE            NOT NULL,
    caja_inicial        NUMERIC(12,2)   NOT NULL CHECK (caja_inicial >= 0),
    nota_apertura       TEXT            NULL,
    abierta_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    cerrada_en          TIMESTAMPTZ     NULL,
    estado              VARCHAR(10)     NOT NULL DEFAULT 'abierta'
                            CHECK (estado IN ('abierta', 'cerrada')),
    UNIQUE (negocio_id, fecha_referencia)
);

COMMENT ON TABLE  jornadas                 IS 'Ciclos operativos del negocio. Una jornada puede cruzar la medianoche';
COMMENT ON COLUMN jornadas.fecha_referencia IS 'Día calendario en que se abrió la jornada. Usado como referencia en el historial';
COMMENT ON COLUMN jornadas.estado          IS 'abierta = en curso. cerrada = cierre confirmado';

-- -------------------------------------------------------------------

CREATE TABLE movimientos_jornada (
    id                  BIGSERIAL       PRIMARY KEY,
    jornada_id          BIGINT          NOT NULL REFERENCES jornadas(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    tipo                VARCHAR(25)     NOT NULL CHECK (tipo IN (
                            'gasto_operativo',
                            'compra_mercancia',
                            'ingreso_no_operativo',
                            'retiro_dueno',
                            'cobro_cuenta_por_cobrar'
                        )),
    categoria_gasto_id  BIGINT          NULL REFERENCES categorias_gastos(id),
    descripcion         VARCHAR(255)    NOT NULL,
    monto               NUMERIC(12,2)   NOT NULL CHECK (monto > 0),
    afecta_caja         BOOLEAN         NOT NULL DEFAULT TRUE,
    signo_caja          SMALLINT        NOT NULL CHECK (signo_caja IN (-1, 1)),
    nota                TEXT            NULL,
    registrado_por      BIGINT          NOT NULL REFERENCES usuarios(id),
    registrado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  movimientos_jornada              IS 'Movimientos registrados durante una jornada activa';
COMMENT ON COLUMN movimientos_jornada.tipo         IS 'Determina cómo afecta el movimiento a la caja y a los indicadores';
COMMENT ON COLUMN movimientos_jornada.signo_caja   IS '-1 = reduce caja (gastos, compras, retiros). +1 = aumenta caja (ingresos, cobros)';
COMMENT ON COLUMN movimientos_jornada.afecta_caja  IS 'FALSE solo para ventas a crédito que aún no han sido cobradas';
COMMENT ON COLUMN movimientos_jornada.categoria_gasto_id IS 'Solo aplica para tipo = gasto_operativo';

-- -------------------------------------------------------------------
-- Índices módulo 3

CREATE INDEX idx_jornadas_negocio
    ON jornadas (negocio_id);

CREATE INDEX idx_jornadas_fecha
    ON jornadas (negocio_id, fecha_referencia);

CREATE UNIQUE INDEX idx_una_jornada_abierta
    ON jornadas (negocio_id)
    WHERE estado = 'abierta';

COMMENT ON INDEX idx_una_jornada_abierta IS 'Garantiza que un negocio solo tenga una jornada abierta a la vez';

CREATE INDEX idx_movimientos_jornada
    ON movimientos_jornada (jornada_id);

CREATE INDEX idx_movimientos_negocio
    ON movimientos_jornada (negocio_id);

CREATE INDEX idx_movimientos_tipo
    ON movimientos_jornada (jornada_id, tipo);


-- =====================================================================
-- MÓDULO 4: CUENTAS POR COBRAR
-- =====================================================================

CREATE TABLE ventas_credito (
    id                  BIGSERIAL       PRIMARY KEY,
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    jornada_id          BIGINT          NOT NULL REFERENCES jornadas(id),
    registrado_por      BIGINT          NOT NULL REFERENCES usuarios(id),
    nombre_cliente      VARCHAR(150)    NOT NULL,
    descripcion         VARCHAR(255)    NULL,
    monto_total         NUMERIC(12,2)   NOT NULL CHECK (monto_total > 0),
    monto_cobrado       NUMERIC(12,2)   NOT NULL DEFAULT 0
                            CHECK (monto_cobrado >= 0),
    estado              VARCHAR(20)     NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'cobrado_parcial', 'cobrado')),
    fecha_registro      DATE            NOT NULL DEFAULT CURRENT_DATE,
    nota                TEXT            NULL,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_monto_cobrado_valido
        CHECK (monto_cobrado <= monto_total)
);

COMMENT ON TABLE  ventas_credito              IS 'Ventas realizadas a crédito. No afectan la caja hasta que se cobran';
COMMENT ON COLUMN ventas_credito.monto_cobrado IS 'Actualizado automáticamente por trigger al registrar cobros';
COMMENT ON COLUMN ventas_credito.estado       IS 'Actualizado automáticamente por trigger según monto_cobrado vs monto_total';

-- -------------------------------------------------------------------

CREATE TABLE cobros_credito (
    id                  BIGSERIAL       PRIMARY KEY,
    venta_credito_id    BIGINT          NOT NULL REFERENCES ventas_credito(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    jornada_id          BIGINT          NOT NULL REFERENCES jornadas(id),
    movimiento_id       BIGINT          NOT NULL REFERENCES movimientos_jornada(id),
    monto_cobrado       NUMERIC(12,2)   NOT NULL CHECK (monto_cobrado > 0),
    registrado_por      BIGINT          NOT NULL REFERENCES usuarios(id),
    registrado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    nota                TEXT            NULL
);

COMMENT ON TABLE  cobros_credito           IS 'Pagos recibidos sobre ventas a crédito';
COMMENT ON COLUMN cobros_credito.movimiento_id IS 'Vincula el cobro al movimiento tipo cobro_cuenta_por_cobrar en la jornada';
COMMENT ON COLUMN cobros_credito.jornada_id    IS 'Jornada en la que se recibió físicamente el pago';

-- -------------------------------------------------------------------
-- Índices módulo 4

CREATE INDEX idx_ventas_credito_negocio
    ON ventas_credito (negocio_id);

CREATE INDEX idx_ventas_credito_jornada
    ON ventas_credito (jornada_id);

CREATE INDEX idx_ventas_credito_estado
    ON ventas_credito (negocio_id, estado)
    WHERE estado IN ('pendiente', 'cobrado_parcial');

CREATE INDEX idx_cobros_credito_venta
    ON cobros_credito (venta_credito_id);

CREATE INDEX idx_cobros_credito_jornada
    ON cobros_credito (jornada_id);

CREATE INDEX idx_cobros_credito_negocio
    ON cobros_credito (negocio_id);


-- =====================================================================
-- MÓDULO 5: CIERRE DE JORNADA
-- =====================================================================

CREATE TABLE cierres_jornada (
    id                      BIGSERIAL       PRIMARY KEY,
    jornada_id              BIGINT          NOT NULL UNIQUE REFERENCES jornadas(id),
    negocio_id              BIGINT          NOT NULL REFERENCES negocios(id),
    cerrado_por             BIGINT          NOT NULL REFERENCES usuarios(id),

    -- Reconciliación de caja
    caja_inicial            NUMERIC(12,2)   NOT NULL,
    caja_final_registrada   NUMERIC(12,2)   NOT NULL CHECK (caja_final_registrada >= 0),
    caja_esperada           NUMERIC(12,2)   NOT NULL,
    diferencia_caja         NUMERIC(12,2)   GENERATED ALWAYS AS (
                                caja_final_registrada - caja_esperada
                            ) STORED,

    -- Indicadores financieros
    ingresos_operativos     NUMERIC(12,2)   NOT NULL DEFAULT 0,
    costo_vendido           NUMERIC(12,2)   NOT NULL DEFAULT 0,
    utilidad_bruta          NUMERIC(12,2)   GENERATED ALWAYS AS (
                                ingresos_operativos - costo_vendido
                            ) STORED,
    gastos_jornada          NUMERIC(12,2)   NOT NULL DEFAULT 0,
    costos_fijos_dia        NUMERIC(12,2)   NOT NULL DEFAULT 0,
    utilidad_neta           NUMERIC(12,2)   GENERATED ALWAYS AS (
                                ingresos_operativos - costo_vendido
                                - gastos_jornada - costos_fijos_dia
                            ) STORED,
    margen_ganancia         NUMERIC(5,2)    GENERATED ALWAYS AS (
                                CASE
                                    WHEN ingresos_operativos > 0
                                    THEN ROUND(
                                        ((ingresos_operativos - costo_vendido
                                          - gastos_jornada - costos_fijos_dia)
                                         / ingresos_operativos) * 100, 2)
                                    ELSE 0
                                END
                            ) STORED,
    punto_equilibrio_dia    NUMERIC(12,2)   NOT NULL DEFAULT 0,
    estado_dia              VARCHAR(15)     NOT NULL
                                CHECK (estado_dia IN ('rentable', 'equilibrio', 'perdida')),
    conteo_realizado        BOOLEAN         NOT NULL DEFAULT FALSE,

    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  cierres_jornada                  IS 'Indicadores financieros persistidos al confirmar el cierre de una jornada';
COMMENT ON COLUMN cierres_jornada.diferencia_caja  IS 'Positivo = sobrante en caja. Negativo = faltante';
COMMENT ON COLUMN cierres_jornada.costos_fijos_dia IS 'Proporción diaria de costos fijos + nómina según días operativos del mes';
COMMENT ON COLUMN cierres_jornada.conteo_realizado IS 'TRUE = el usuario hizo el conteo de productos. FALSE = se usó margen promedio';

-- -------------------------------------------------------------------

CREATE TABLE conteo_productos_cierre (
    id                  BIGSERIAL       PRIMARY KEY,
    cierre_id           BIGINT          NOT NULL REFERENCES cierres_jornada(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    producto_id         BIGINT          NOT NULL REFERENCES productos(id),
    unidades_vendidas   INTEGER         NOT NULL CHECK (unidades_vendidas >= 0),
    precio_venta        NUMERIC(12,2)   NOT NULL,
    costo_unitario      NUMERIC(12,2)   NOT NULL,
    subtotal_ingresos   NUMERIC(12,2)   GENERATED ALWAYS AS (
                            unidades_vendidas * precio_venta
                        ) STORED,
    subtotal_costo      NUMERIC(12,2)   GENERATED ALWAYS AS (
                            unidades_vendidas * costo_unitario
                        ) STORED,
    subtotal_utilidad   NUMERIC(12,2)   GENERATED ALWAYS AS (
                            (unidades_vendidas * precio_venta)
                            - (unidades_vendidas * costo_unitario)
                        ) STORED,
    UNIQUE (cierre_id, producto_id)
);

COMMENT ON TABLE  conteo_productos_cierre            IS 'Detalle de unidades vendidas por producto en cada cierre';
COMMENT ON COLUMN conteo_productos_cierre.precio_venta    IS 'Copia del precio al momento del cierre. Protege el historial de cambios futuros';
COMMENT ON COLUMN conteo_productos_cierre.costo_unitario  IS 'Copia del costo al momento del cierre. Protege el historial de cambios futuros';

-- -------------------------------------------------------------------

CREATE TABLE auditoria_cierres (
    id                  BIGSERIAL       PRIMARY KEY,
    cierre_id           BIGINT          NOT NULL REFERENCES cierres_jornada(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    modificado_por      BIGINT          NOT NULL REFERENCES usuarios(id),
    justificacion       TEXT            NOT NULL,
    valores_anteriores  JSONB           NOT NULL,
    valores_nuevos      JSONB           NOT NULL,
    modificado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  auditoria_cierres                   IS 'Registro de todas las correcciones realizadas sobre cierres confirmados';
COMMENT ON COLUMN auditoria_cierres.valores_anteriores IS 'Snapshot JSONB del cierre antes de la corrección';
COMMENT ON COLUMN auditoria_cierres.valores_nuevos     IS 'Snapshot JSONB del cierre después de la corrección';

-- -------------------------------------------------------------------
-- Índices módulo 5

CREATE INDEX idx_cierres_negocio
    ON cierres_jornada (negocio_id);

CREATE INDEX idx_cierres_fecha
    ON cierres_jornada (negocio_id, creado_en);

CREATE INDEX idx_conteo_cierre
    ON conteo_productos_cierre (cierre_id);

CREATE INDEX idx_conteo_producto
    ON conteo_productos_cierre (producto_id);

CREATE INDEX idx_auditoria_cierre
    ON auditoria_cierres (cierre_id);

CREATE INDEX idx_auditoria_negocio
    ON auditoria_cierres (negocio_id);

CREATE INDEX idx_auditoria_fecha
    ON auditoria_cierres (modificado_en);


-- =====================================================================
-- MÓDULO 6: SIMULADOR FINANCIERO
-- =====================================================================

CREATE TABLE escenarios_simulacion (
    id                          BIGSERIAL       PRIMARY KEY,
    negocio_id                  BIGINT          NOT NULL REFERENCES negocios(id),
    creado_por                  BIGINT          NOT NULL REFERENCES usuarios(id),
    nombre                      VARCHAR(150)    NOT NULL,
    descripcion                 TEXT            NULL,

    periodo_base_inicio         DATE            NOT NULL,
    periodo_base_fin            DATE            NOT NULL,

    -- Situación actual (promedio real del período base)
    ingresos_diarios_actual     NUMERIC(12,2)   NOT NULL DEFAULT 0,
    utilidad_neta_actual        NUMERIC(12,2)   NOT NULL DEFAULT 0,
    margen_actual               NUMERIC(5,2)    NOT NULL DEFAULT 0,
    equilibrio_actual           NUMERIC(12,2)   NOT NULL DEFAULT 0,

    -- Escenario simulado
    ingresos_diarios_simulado   NUMERIC(12,2)   NOT NULL DEFAULT 0,
    utilidad_neta_simulado      NUMERIC(12,2)   NOT NULL DEFAULT 0,
    margen_simulado             NUMERIC(5,2)    NOT NULL DEFAULT 0,
    equilibrio_simulado         NUMERIC(12,2)   NOT NULL DEFAULT 0,

    -- Variaciones calculadas automáticamente
    variacion_ingresos          NUMERIC(5,2)    GENERATED ALWAYS AS (
                                    CASE
                                        WHEN ingresos_diarios_actual > 0
                                        THEN ROUND(
                                            ((ingresos_diarios_simulado - ingresos_diarios_actual)
                                             / ingresos_diarios_actual) * 100, 2)
                                        ELSE 0
                                    END
                                ) STORED,
    variacion_utilidad          NUMERIC(5,2)    GENERATED ALWAYS AS (
                                    CASE
                                        WHEN utilidad_neta_actual > 0
                                        THEN ROUND(
                                            ((utilidad_neta_simulado - utilidad_neta_actual)
                                             / utilidad_neta_actual) * 100, 2)
                                        ELSE 0
                                    END
                                ) STORED,

    creado_en                   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    eliminado_en                TIMESTAMPTZ     NULL,

    CONSTRAINT chk_periodo_valido
        CHECK (periodo_base_fin >= periodo_base_inicio)
);

COMMENT ON TABLE  escenarios_simulacion                 IS 'Escenarios financieros guardados por el propietario';
COMMENT ON COLUMN escenarios_simulacion.periodo_base_inicio IS 'Inicio del período usado para calcular los promedios base';
COMMENT ON COLUMN escenarios_simulacion.ingresos_diarios_actual IS 'Promedio real calculado sobre el período base al momento de guardar';

-- -------------------------------------------------------------------

CREATE TABLE variables_simulacion (
    id                  BIGSERIAL       PRIMARY KEY,
    escenario_id        BIGINT          NOT NULL REFERENCES escenarios_simulacion(id),
    negocio_id          BIGINT          NOT NULL REFERENCES negocios(id),
    tipo_variable       VARCHAR(25)     NOT NULL CHECK (tipo_variable IN (
                            'precio_producto',
                            'costo_producto',
                            'volumen_ventas',
                            'costo_fijo',
                            'dias_operativos'
                        )),
    producto_id         BIGINT          NULL REFERENCES productos(id),
    costo_fijo_id       BIGINT          NULL REFERENCES costos_fijos(id),
    valor_actual        NUMERIC(12,2)   NOT NULL,
    valor_simulado      NUMERIC(12,2)   NOT NULL CHECK (valor_simulado >= 0),
    variacion_pct       NUMERIC(5,2)    GENERATED ALWAYS AS (
                            CASE
                                WHEN valor_actual > 0
                                THEN ROUND(
                                    ((valor_simulado - valor_actual)
                                     / valor_actual) * 100, 2)
                                ELSE 0
                            END
                        ) STORED,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  variables_simulacion            IS 'Variables modificadas en cada escenario de simulación';
COMMENT ON COLUMN variables_simulacion.producto_id  IS 'NULL si la variable no aplica a un producto específico';
COMMENT ON COLUMN variables_simulacion.costo_fijo_id IS 'NULL si la variable no aplica a un costo fijo específico';

-- -------------------------------------------------------------------
-- Índices módulo 6

CREATE INDEX idx_escenarios_negocio
    ON escenarios_simulacion (negocio_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_escenarios_creado_por
    ON escenarios_simulacion (creado_por)
    WHERE eliminado_en IS NULL;

CREATE INDEX idx_variables_escenario
    ON variables_simulacion (escenario_id);

CREATE INDEX idx_variables_producto
    ON variables_simulacion (producto_id)
    WHERE producto_id IS NOT NULL;

CREATE INDEX idx_variables_costo_fijo
    ON variables_simulacion (costo_fijo_id)
    WHERE costo_fijo_id IS NOT NULL;


-- =====================================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================================

-- Función: actualizar estado y monto_cobrado en ventas_credito
-- Se dispara automáticamente tras cada inserción en cobros_credito

CREATE OR REPLACE FUNCTION actualizar_estado_venta_credito()
RETURNS TRIGGER AS $$
DECLARE
    v_total         NUMERIC(12,2);
    v_cobrado       NUMERIC(12,2);
    v_nuevo_estado  VARCHAR(20);
BEGIN
    SELECT monto_total INTO v_total
    FROM ventas_credito
    WHERE id = NEW.venta_credito_id;

    SELECT COALESCE(SUM(monto_cobrado), 0) INTO v_cobrado
    FROM cobros_credito
    WHERE venta_credito_id = NEW.venta_credito_id;

    IF v_cobrado >= v_total THEN
        v_nuevo_estado := 'cobrado';
    ELSIF v_cobrado > 0 THEN
        v_nuevo_estado := 'cobrado_parcial';
    ELSE
        v_nuevo_estado := 'pendiente';
    END IF;

    UPDATE ventas_credito
    SET monto_cobrado  = v_cobrado,
        estado         = v_nuevo_estado,
        actualizado_en = NOW()
    WHERE id = NEW.venta_credito_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_estado_venta_credito IS
    'Recalcula monto_cobrado y estado en ventas_credito tras cada nuevo cobro';

CREATE TRIGGER trg_actualizar_estado_cobro
    AFTER INSERT ON cobros_credito
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estado_venta_credito();


-- =====================================================================
-- FIN DEL SCRIPT
-- Total: 16 tablas, 2 funciones, 1 trigger, 28 índices
-- =====================================================================
