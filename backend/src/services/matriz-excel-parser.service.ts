import ExcelJS from 'exceljs';
import { inspectMatrizXlsxOoxml } from './matriz-ooxml-inspector.service';

export type ValoracionMatriz = 1 | 2 | 3;
export type PosicionMatriz = 1 | 2 | 3;
export type ColumnaValoracionMatriz = 'C' | 'D' | 'E';

export type RespuestaPerfilTransaccional = {
  posicion: PosicionMatriz;
  texto: string;
  valoracion: ValoracionMatriz;
  columnaOrigen: ColumnaValoracionMatriz;
};

export type BloquePerfilTransaccional = {
  pregunta: string;
  respuestas: [RespuestaPerfilTransaccional, RespuestaPerfilTransaccional, RespuestaPerfilTransaccional];
};

export type CondicionGradoRiesgo = {
  posicion: PosicionMatriz;
  texto: string;
  valoracion: ValoracionMatriz;
  columnaOrigen: ColumnaValoracionMatriz;
};

export type CriterioGradoRiesgo = {
  nombre: string;
  textoKyc: string;
  condiciones: [CondicionGradoRiesgo, CondicionGradoRiesgo, CondicionGradoRiesgo];
};

export type ResultadoMatriz = {
  nombre: string;
  minimo: number;
  maximo: number;
};

export type PerfilTransaccionalMatriz = {
  hoja: 'PERFIL TRANSACCIONAL';
  bloques: [BloquePerfilTransaccional, BloquePerfilTransaccional, BloquePerfilTransaccional, BloquePerfilTransaccional];
  resultados: [ResultadoMatriz, ResultadoMatriz, ResultadoMatriz];
};

export type GradoRiesgoMatriz = {
  hoja: 'GRADO DE RIESGO DE CLIENTE';
  criterios: [CriterioGradoRiesgo, CriterioGradoRiesgo, CriterioGradoRiesgo, CriterioGradoRiesgo];
  resultados: [ResultadoMatriz, ResultadoMatriz, ResultadoMatriz];
};

export type MatrizEmpresaNormalizada = {
  version: 'PT_GR_EMPRESA_V1';
  perfilTransaccional: PerfilTransaccionalMatriz;
  gradoRiesgo: GradoRiesgoMatriz;
};

export type MatrizExcelParseErrorCode =
  | 'EXCEL_NO_LEIBLE'
  | 'HOJAS_INVALIDAS'
  | 'ESTRUCTURA_HOJA_INVALIDA'
  | 'ENCABEZADO_INVALIDO'
  | 'TEXTO_OBLIGATORIO'
  | 'TEXTO_EXCEDE_MAXIMO'
  | 'POSICION_INVALIDA'
  | 'VALORACION_INVALIDA'
  | 'DISTRIBUCION_VALORACIONES_INVALIDA'
  | 'DATO_KYC_INCONSISTENTE'
  | 'RANGO_FORMATO_INVALIDO'
  | 'RANGO_LIMITES_INVALIDOS'
  | 'RANGOS_COBERTURA_INVALIDA'
  | 'CELDA_DEBE_ESTAR_VACIA';

export class MatrizExcelParseError extends Error {
  constructor(
    public readonly code: MatrizExcelParseErrorCode,
    message: string,
    public readonly hoja: string,
    public readonly celda?: string,
  ) {
    super(message);
    this.name = 'MatrizExcelParseError';
  }
}

type Rango = { minimo: number; maximo: number };
type ValoracionLeida = { valoracion: ValoracionMatriz; columnaOrigen: ColumnaValoracionMatriz };

const HOJA_PT = 'PERFIL TRANSACCIONAL' as const;
const HOJA_GR = 'GRADO DE RIESGO DE CLIENTE' as const;
const HOJAS = [HOJA_PT, HOJA_GR] as const;
const FILAS_BLOQUE = [3, 7, 11, 15] as const;
const POSICIONES = [1, 2, 3] as const;
const MERGES_PT = ['A1:E1', 'A2:E2', 'F3:G3'] as const;
const MERGES_GR = ['A1:E1', 'A2:E2', 'G3:H3', 'F4:F6', 'F8:F10', 'F12:F14', 'F16:F18'] as const;
const VALORACIONES = [
  { columnaOrigen: 'C' as const, valoracion: 3 as const },
  { columnaOrigen: 'D' as const, valoracion: 2 as const },
  { columnaOrigen: 'E' as const, valoracion: 1 as const },
] as const;

export async function parseMatrizEmpresaExcel(input: Buffer): Promise<MatrizEmpresaNormalizada> {
  await inspectMatrizXlsxOoxml(input);

  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(Uint8Array.from(input).buffer);
  } catch {
    throw error('EXCEL_NO_LEIBLE', 'No fue posible leer el libro de Excel.', 'LIBRO');
  }

  validarHojas(libro);
  const hojaPt = libro.getWorksheet(HOJA_PT);
  const hojaGr = libro.getWorksheet(HOJA_GR);
  if (hojaPt === undefined || hojaGr === undefined) {
    throw error('HOJAS_INVALIDAS', 'El libro debe contener exactamente las dos hojas V1 requeridas.', 'LIBRO');
  }

  validarDimension(hojaPt, 7);
  validarDimension(hojaGr, 8);
  validarMergesExactos(hojaPt, MERGES_PT);
  validarMergesExactos(hojaGr, MERGES_GR);
  validarMapaExhaustivo(hojaPt, 7, crearCeldasAutorizadasPt());
  validarMapaExhaustivo(hojaGr, 8, crearCeldasAutorizadasGr());

  return {
    version: 'PT_GR_EMPRESA_V1',
    perfilTransaccional: parsearPt(hojaPt),
    gradoRiesgo: parsearGr(hojaGr),
  };
}

function validarHojas(libro: ExcelJS.Workbook): void {
  const nombres = libro.worksheets.map((hoja) => hoja.name);
  const nombresUnicos = new Set(nombres);
  if (nombres.length !== 2 || nombresUnicos.size !== 2 || HOJAS.some((nombre) => !nombresUnicos.has(nombre))) {
    throw error('HOJAS_INVALIDAS', `Las hojas deben ser exactamente: ${HOJAS.join(', ')}.`, 'LIBRO');
  }
}

function validarDimension(hoja: ExcelJS.Worksheet, columnas: 7 | 8): void {
  if (hoja.rowCount !== 19 || hoja.columnCount !== columnas) {
    throw error(
      'ESTRUCTURA_HOJA_INVALIDA',
      `La hoja debe tener exactamente 19 filas físicas y columnas A:${columnas === 7 ? 'G' : 'H'}.`,
      hoja.name,
    );
  }
}

function parsearPt(hoja: ExcelJS.Worksheet): PerfilTransaccionalMatriz {
  textoObligatorioSinLimite(hoja, 'A1');
  textoObligatorioSinLimite(hoja, 'A2');
  validarEncabezados(hoja, {
    B3: 'Descripción',
    B7: 'Descripción',
    B11: 'Descripción',
    B15: 'Descripción',
    C3: 'Puntaje máximo',
    D3: 'Puntaje medio',
    E3: 'Puntaje bajo',
  });
  validarEncabezadoCombinado(hoja, 'F3:G3', 'F3', 'G3', 'Criterios');

  const bloques = FILAS_BLOQUE.map((filaPregunta) => {
    const respuestas = POSICIONES.map((posicion) => {
      const fila = filaPregunta + posicion;
      validarPosicion(hoja, fila, posicion);
      return {
        posicion,
        texto: textoObligatorio(hoja, `B${fila}`, 500),
        ...leerValoracion(hoja, fila),
      };
    }) as BloquePerfilTransaccional['respuestas'];

    validarDistribucion(hoja, filaPregunta, respuestas);
    return {
      pregunta: textoObligatorio(hoja, `A${filaPregunta}`, 200),
      respuestas,
    };
  }) as PerfilTransaccionalMatriz['bloques'];

  for (const columna of ['A', 'B', 'F', 'G'] as const) {
    validarVacia(hoja, `${columna}19`);
  }
  for (const columna of ['C', 'D', 'E'] as const) {
    validarVaciaOFormula(hoja, `${columna}19`);
  }

  return { hoja: HOJA_PT, bloques, resultados: leerResultados(hoja, 'F', 'G') };
}

function parsearGr(hoja: ExcelJS.Worksheet): GradoRiesgoMatriz {
  textoObligatorioSinLimite(hoja, 'A1');
  textoObligatorioSinLimite(hoja, 'A2');
  validarEncabezados(hoja, {
    B3: 'Descripción',
    B7: 'Descripción',
    B11: 'Descripción',
    B15: 'Descripción',
    C3: 'Puntaje máximo',
    D3: 'Puntaje medio',
    E3: 'Puntaje bajo',
    F3: 'Dato a usar del KYC',
  });
  validarEncabezadoCombinado(hoja, 'G3:H3', 'G3', 'H3', 'Criterios');

  const criterios = FILAS_BLOQUE.map((filaCriterio) => {
    const textosKyc = POSICIONES.map((posicion) =>
      textoObligatorio(hoja, `F${filaCriterio + posicion}`, 1000));

    for (let indice = 1; indice < textosKyc.length; indice += 1) {
      if (textosKyc[indice] !== textosKyc[0]) {
        throw error(
          'DATO_KYC_INCONSISTENTE',
          'Las tres celdas KYC del criterio deben contener exactamente el mismo texto después de trim.',
          hoja.name,
          `F${filaCriterio + indice + 1}`,
        );
      }
    }

    const condiciones = POSICIONES.map((posicion) => {
      const fila = filaCriterio + posicion;
      validarPosicion(hoja, fila, posicion);
      return {
        posicion,
        texto: textoObligatorio(hoja, `B${fila}`, 1000),
        ...leerValoracion(hoja, fila),
      };
    }) as CriterioGradoRiesgo['condiciones'];

    validarDistribucion(hoja, filaCriterio, condiciones);
    return {
      nombre: textoObligatorio(hoja, `A${filaCriterio}`, 200),
      textoKyc: textosKyc[0],
      condiciones,
    };
  }) as GradoRiesgoMatriz['criterios'];

  for (const columna of ['A', 'B', 'F', 'G', 'H'] as const) {
    validarVacia(hoja, `${columna}19`);
  }
  for (const columna of ['C', 'D', 'E'] as const) {
    validarVaciaOFormula(hoja, `${columna}19`);
  }

  return { hoja: HOJA_GR, criterios, resultados: leerResultados(hoja, 'G', 'H') };
}

function validarEncabezados(hoja: ExcelJS.Worksheet, encabezados: Readonly<Record<string, string>>): void {
  for (const [direccion, textoEsperado] of Object.entries(encabezados)) {
    const valor = hoja.getCell(direccion).value;
    if (typeof valor !== 'string' || valor.trim() !== textoEsperado) {
      throw error(
        'ENCABEZADO_INVALIDO',
        `La celda debe contener exactamente el texto literal "${textoEsperado}".`,
        hoja.name,
        direccion,
      );
    }
  }
}

function validarEncabezadoCombinado(
  hoja: ExcelJS.Worksheet,
  rangoEsperado: string,
  direccionMaestra: string,
  direccionSecundaria: string,
  textoEsperado: string,
): void {
  const maestra = hoja.getCell(direccionMaestra);
  const secundaria = hoja.getCell(direccionSecundaria);
  if (!maestra.isMerged
    || maestra.master.address !== direccionMaestra
    || !secundaria.isMergedTo(maestra)) {
    throw error(
      'ESTRUCTURA_HOJA_INVALIDA',
      `La hoja debe conservar exactamente la combinación ${rangoEsperado}, con ${direccionMaestra} como celda maestra.`,
      hoja.name,
      direccionMaestra,
    );
  }

  const valor = maestra.value;
  if (typeof valor !== 'string' || valor.trim() !== textoEsperado) {
    throw error(
      'ENCABEZADO_INVALIDO',
      `La celda debe contener exactamente el texto literal "${textoEsperado}".`,
      hoja.name,
      direccionMaestra,
    );
  }
}

function validarMergesExactos(hoja: ExcelJS.Worksheet, esperados: readonly string[]): void {
  const mergesModelo = hoja.model.merges;
  if (!Array.isArray(mergesModelo) || mergesModelo.some((rango) => typeof rango !== 'string')) {
    throw error('ESTRUCTURA_HOJA_INVALIDA', 'No fue posible validar las combinaciones de celdas.', hoja.name);
  }

  const normalizados = mergesModelo.map((rango) => rango.replace(/\$/g, '').toUpperCase());
  const conjunto = new Set(normalizados);
  if (normalizados.length !== esperados.length
    || conjunto.size !== esperados.length
    || esperados.some((rango) => !conjunto.has(rango))) {
    throw error(
      'ESTRUCTURA_HOJA_INVALIDA',
      `Las combinaciones deben ser exactamente: ${esperados.join(', ')}.`,
      hoja.name,
    );
  }

  for (const rango of esperados) {
    const [inicio, fin] = rango.split(':');
    const maestra = hoja.getCell(inicio);
    const columnaInicial = maestra.col;
    const filaInicial = maestra.row;
    const celdaFinal = hoja.getCell(fin);
    for (let fila = filaInicial; fila <= celdaFinal.row; fila += 1) {
      for (let columna = columnaInicial; columna <= celdaFinal.col; columna += 1) {
        const celda = hoja.getCell(fila, columna);
        if (!celda.isMerged || celda.master.address !== inicio) {
          throw error(
            'ESTRUCTURA_HOJA_INVALIDA',
            `La hoja debe conservar exactamente la combinación ${rango}, con ${inicio} como celda maestra.`,
            hoja.name,
            inicio,
          );
        }
      }
    }
  }
}

function crearCeldasAutorizadasPt(): ReadonlySet<string> {
  const autorizadas = crearCeldasComunes();
  autorizadas.add('F3');
  agregarRango(autorizadas, 'F', 4, 6);
  agregarRango(autorizadas, 'G', 4, 6);
  return autorizadas;
}

function crearCeldasAutorizadasGr(): ReadonlySet<string> {
  const autorizadas = crearCeldasComunes();
  autorizadas.add('F3');
  autorizadas.add('G3');
  for (const filaEncabezado of FILAS_BLOQUE) agregarRango(autorizadas, 'F', filaEncabezado + 1, filaEncabezado + 3);
  agregarRango(autorizadas, 'G', 4, 6);
  agregarRango(autorizadas, 'H', 4, 6);
  return autorizadas;
}

function crearCeldasComunes(): Set<string> {
  const autorizadas = new Set<string>(['A1', 'A2', 'C3', 'D3', 'E3', 'C19', 'D19', 'E19']);
  for (const filaEncabezado of FILAS_BLOQUE) {
    autorizadas.add(`A${filaEncabezado}`);
    autorizadas.add(`B${filaEncabezado}`);
    for (const posicion of POSICIONES) {
      const fila = filaEncabezado + posicion;
      for (const columna of ['A', 'B', 'C', 'D', 'E']) autorizadas.add(`${columna}${fila}`);
    }
  }
  return autorizadas;
}

function agregarRango(celdas: Set<string>, columna: string, desde: number, hasta: number): void {
  for (let fila = desde; fila <= hasta; fila += 1) celdas.add(`${columna}${fila}`);
}

function validarMapaExhaustivo(
  hoja: ExcelJS.Worksheet,
  columnas: 7 | 8,
  autorizadas: ReadonlySet<string>,
): void {
  for (let fila = 1; fila <= 19; fila += 1) {
    for (let columna = 1; columna <= columnas; columna += 1) {
      const celda = hoja.getCell(fila, columna);
      const esSecundariaDeMerge = celda.isMerged && celda.master.address !== celda.address;
      if (!autorizadas.has(celda.address) && !esSecundariaDeMerge) validarVacia(hoja, celda.address);
    }
  }
}

function validarPosicion(hoja: ExcelJS.Worksheet, fila: number, posicion: PosicionMatriz): void {
  const celda = hoja.getCell(`A${fila}`);
  if (typeof celda.value !== 'number' || celda.value !== posicion) {
    throw error('POSICION_INVALIDA', `La celda debe contener el número literal ${posicion}.`, hoja.name, celda.address);
  }
}

function leerValoracion(hoja: ExcelJS.Worksheet, fila: number): ValoracionLeida {
  const presentes = VALORACIONES.filter(({ columnaOrigen }) =>
    !esFuncionalmenteVacia(hoja.getCell(`${columnaOrigen}${fila}`)));

  if (presentes.length !== 1) {
    throw error(
      'VALORACION_INVALIDA',
      'Debe existir exactamente una valoración numérica literal en C, D o E.',
      hoja.name,
      `C${fila}:E${fila}`,
    );
  }

  const seleccionada = presentes[0];
  const celda = hoja.getCell(`${seleccionada.columnaOrigen}${fila}`);
  if (typeof celda.value !== 'number' || celda.value !== seleccionada.valoracion) {
    throw error(
      'VALORACION_INVALIDA',
      `La celda debe contener el número literal ${seleccionada.valoracion}; no se admite texto ni fórmula.`,
      hoja.name,
      celda.address,
    );
  }
  return seleccionada;
}

function validarDistribucion(
  hoja: ExcelJS.Worksheet,
  filaEncabezado: number,
  opciones: ReadonlyArray<{ valoracion: ValoracionMatriz }>,
): void {
  const cantidades = new Map<ValoracionMatriz, number>([[1, 0], [2, 0], [3, 0]]);
  for (const opcion of opciones) cantidades.set(opcion.valoracion, (cantidades.get(opcion.valoracion) ?? 0) + 1);
  if (cantidades.get(1) !== 1 || cantidades.get(2) !== 1 || cantidades.get(3) !== 1) {
    throw error(
      'DISTRIBUCION_VALORACIONES_INVALIDA',
      'El bloque debe contener exactamente una valoración 1, una 2 y una 3.',
      hoja.name,
      `C${filaEncabezado + 1}:E${filaEncabezado + 3}`,
    );
  }
}

function leerResultados(
  hoja: ExcelJS.Worksheet,
  columnaNombre: 'F' | 'G',
  columnaRango: 'G' | 'H',
): [ResultadoMatriz, ResultadoMatriz, ResultadoMatriz] {
  const resultados = ([4, 5, 6] as const).map((fila) => ({
    nombre: textoObligatorio(hoja, `${columnaNombre}${fila}`, 150),
    ...leerRango(hoja, `${columnaRango}${fila}`),
  })) as [ResultadoMatriz, ResultadoMatriz, ResultadoMatriz];
  validarCobertura(hoja, columnaRango, resultados);
  return resultados;
}

function leerRango(hoja: ExcelJS.Worksheet, direccion: string): Rango {
  const texto = textoObligatorio(hoja, direccion, 30);
  const partes = /^(\d+)\s*a\s*(\d+)$/.exec(texto);
  if (partes === null) {
    throw error(
      'RANGO_FORMATO_INVALIDO',
      'El rango debe contener exactamente dos enteros separados por "a".',
      hoja.name,
      direccion,
    );
  }

  const minimo = Number(partes[1]);
  const maximo = Number(partes[2]);
  if (!Number.isSafeInteger(minimo) || !Number.isSafeInteger(maximo)
    || minimo < 4 || minimo > 12 || maximo < 4 || maximo > 12 || minimo > maximo) {
    throw error(
      'RANGO_LIMITES_INVALIDOS',
      'Los límites deben ser enteros inclusivos dentro de 4..12 y cumplir mínimo <= máximo.',
      hoja.name,
      direccion,
    );
  }
  return { minimo, maximo };
}

function validarCobertura(
  hoja: ExcelJS.Worksheet,
  columna: 'G' | 'H',
  rangos: ReadonlyArray<Rango>,
): void {
  for (let valor = 4; valor <= 12; valor += 1) {
    const coincidencias = rangos.filter(({ minimo, maximo }) => minimo <= valor && valor <= maximo).length;
    if (coincidencias !== 1) {
      throw error(
        'RANGOS_COBERTURA_INVALIDA',
        'Los tres rangos deben cubrir exactamente 4..12, sin huecos ni traslapes.',
        hoja.name,
        `${columna}4:${columna}6`,
      );
    }
  }
}

function textoObligatorio(hoja: ExcelJS.Worksheet, direccion: string, maximo: number): string {
  const celda = hoja.getCell(direccion);
  if (esFormula(celda.value)) {
    throw error('TEXTO_OBLIGATORIO', 'La celda debe contener texto literal obligatorio; no se admite fórmula.', hoja.name, direccion);
  }

  const literal = extraerTexto(celda.value);
  if (literal === undefined || literal.trim().length === 0) {
    throw error('TEXTO_OBLIGATORIO', 'La celda debe contener texto obligatorio.', hoja.name, direccion);
  }

  const texto = literal.trim();
  if (texto.length > maximo) {
    throw error(
      'TEXTO_EXCEDE_MAXIMO',
      `La celda excede el máximo permitido de ${maximo} caracteres.`,
      hoja.name,
      direccion,
    );
  }
  return texto;
}

function textoObligatorioSinLimite(hoja: ExcelJS.Worksheet, direccion: string): void {
  const celda = hoja.getCell(direccion);
  const literal = extraerTexto(celda.value);
  if (esFormula(celda.value) || literal === undefined || literal.trim().length === 0) {
    throw error(
      'TEXTO_OBLIGATORIO',
      'La celda debe contener texto literal obligatorio; no se admite fórmula.',
      hoja.name,
      direccion,
    );
  }
}

function extraerTexto(valor: ExcelJS.CellValue): string | undefined {
  if (typeof valor === 'string') return valor;
  if (!esRegistro(valor)) return undefined;
  if (Array.isArray(valor.richText)
    && valor.richText.every((parte) => esRegistro(parte) && typeof parte.text === 'string')) {
    return valor.richText.map((parte) => (parte as { text: string }).text).join('');
  }
  if (typeof valor.text === 'string' && typeof valor.hyperlink === 'string') return valor.text;
  return undefined;
}

function validarVacia(hoja: ExcelJS.Worksheet, direccion: string): void {
  if (!esFuncionalmenteVacia(hoja.getCell(direccion))) {
    throw error(
      'CELDA_DEBE_ESTAR_VACIA',
      'La celda debe permanecer funcionalmente vacía y no puede contener una fórmula.',
      hoja.name,
      direccion,
    );
  }
}

function validarVaciaOFormula(hoja: ExcelJS.Worksheet, direccion: string): void {
  const celda = hoja.getCell(direccion);
  if (!esFuncionalmenteVacia(celda) && !esFormula(celda.value)) {
    throw error(
      'CELDA_DEBE_ESTAR_VACIA',
      'La celda solo puede permanecer funcionalmente vacía o contener una fórmula opcional.',
      hoja.name,
      direccion,
    );
  }
}

function esFuncionalmenteVacia(celda: ExcelJS.Cell): boolean {
  return celda.value === null || celda.value === undefined
    || (typeof celda.value === 'string' && celda.value.trim().length === 0);
}

function esFormula(valor: ExcelJS.CellValue): boolean {
  return esRegistro(valor)
    && (typeof valor.formula === 'string' || typeof valor.sharedFormula === 'string');
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function error(
  code: MatrizExcelParseErrorCode,
  message: string,
  hoja: string,
  celda?: string,
): MatrizExcelParseError {
  return new MatrizExcelParseError(code, message, hoja, celda);
}
