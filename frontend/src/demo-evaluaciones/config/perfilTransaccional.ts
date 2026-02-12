import { EvaluationConfig } from "../types";

export const perfilTransaccionalConfig: EvaluationConfig = {
  id: "perfil-transaccional",
  title: "Perfil Transaccional",
  criteria: [
    {
      id: "tipo_servicio",
      label: "Tipo de Servicio",
      options: [
        {
          id: "ts_1",
          label:
            "Servicios profesionales que la responsabilidad legal ante terceros es del cliente",
          score: 1,
        },
        {
          id: "ts_2",
          label: "Servicios profesionales que llevan responsabilidad ante terceros",
          score: 2,
        },
        {
          id: "ts_3",
          label: "Servicios profesionales donde se adquiere la representación legal",
          score: 3,
        },
      ],
    },
    {
      id: "naturaleza_servicio",
      label: "Naturaleza del Servicio",
      options: [
        { id: "ns_1", label: "Servicio profesional único y local", score: 1 },
        {
          id: "ns_2",
          label: "Servicio internacional y/o más de dos servicios profesionales",
          score: 2,
        },
        {
          id: "ns_3",
          label: "Tipo de servicio 3, y más de un servicio profesional",
          score: 3,
        },
      ],
    },
    {
      id: "monto_servicio",
      label: "Monto del Servicio",
      options: [
        { id: "ms_1", label: "Desde $1 hasta $100,000", score: 1 },
        { id: "ms_2", label: "Desde $100,001 hasta $500,000", score: 2 },
        { id: "ms_3", label: "Más de $500,000", score: 3 },
      ],
    },
    {
      id: "frecuencia_servicio",
      label: "Frecuencia del Servicio",
      options: [
        { id: "fs_1", label: "Cliente nuevo - pago único", score: 1 },
        { id: "fs_2", label: "Cliente recurrente - pago único o mensual", score: 2 },
        { id: "fs_3", label: "Cliente nuevo recuperado", score: 3 },
      ],
    },
  ],
  bands: [
    { id: "pt_1", label: "Perfil Transaccional I", min: 1, max: 6, colorName: "Verde" },
    { id: "pt_2", label: "Perfil Transaccional II", min: 7, max: 9, colorName: "Amarillo" },
    { id: "pt_3", label: "Perfil Transaccional III", min: 10, max: 12, colorName: "Rojo" },
  ],
};
