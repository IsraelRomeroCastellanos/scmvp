import { EvaluationConfig } from "../types";

export const gradoRiesgoConfig: EvaluationConfig = {
  id: "grado-riesgo",
  title: "Grado de Riesgo de Cliente",
  criteria: [
    {
      id: "tipo_cliente",
      label: "Tipo de cliente",
      options: [
        {
          id: "tc_1",
          label:
            "PF/PM/Fideicomisos nacionales (no reciente creación > 3 años)",
          score: 1,
        },
        {
          id: "tc_2",
          label:
            "PF/PM/Fideicomisos extranjeras (no reciente creación > 3 años) y nacionales de reciente creación (< 3 años)",
          score: 2,
        },
        {
          id: "tc_3",
          label: "PF/PM/Fideicomisos extranjeras (reciente creación < 3 años)",
          score: 3,
        },
      ],
    },
    {
      id: "actividad_economica",
      label: "Actividad Económica",
      options: [
        { id: "ae_1", label: "No es PEP, AV o Sistema Financiero", score: 1 },
        {
          id: "ae_2",
          label: "Es PEP Nacional, AV o Sistema Financiero o Navieras",
          score: 2,
        },
        { id: "ae_3", label: "Es PEP Extranjero; venta de Armas", score: 3 },
      ],
    },
    {
      id: "lugar_residencia",
      label: "Lugar de residencia",
      options: [
        { id: "lr_1", label: "México", score: 1 },
        { id: "lr_2", label: "Extranjero (sin considerar siguiente nivel)", score: 2 },
        { id: "lr_3", label: "Paraísos fiscales, Clientes lista gris GAFI", score: 3 },
      ],
    },
    {
      id: "antecedentes",
      label: "Antecedentes del Cliente",
      options: [
        { id: "ac_1", label: "Sin coincidencias", score: 1 },
        {
          id: "ac_2",
          label: "Coincidencias de multas sin impacto reputacional o internacional",
          score: 2,
        },
        {
          id: "ac_3",
          label:
            "Coincidencias de mala reputación… o multas con impacto reputacional/internacional",
          score: 3,
        },
      ],
    },
  ],
  bands: [
    { id: "gr_1", label: "Grado de riesgo Bajo", min: 1, max: 6, colorName: "Verde" },
    { id: "gr_2", label: "Grado de riesgo Medio", min: 7, max: 9, colorName: "Amarillo" },
    { id: "gr_3", label: "Grado de riesgo Alto", min: 10, max: 12, colorName: "Rojo" },
  ],
};
