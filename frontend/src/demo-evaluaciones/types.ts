export type ScoreValue = 1 | 2 | 3;

export type OptionDef = {
  id: string;
  label: string;
  score: ScoreValue;
};

export type CriterionDef = {
  id: string;
  label: string;
  options: OptionDef[];
};

export type BandDef = {
  id: string;
  label: string;
  min: number;
  max: number;
  colorName: "Verde" | "Amarillo" | "Rojo";
};

export type EvaluationConfig = {
  id: "perfil-transaccional" | "grado-riesgo";
  title: string;
  criteria: CriterionDef[];
  bands: BandDef[];
};
