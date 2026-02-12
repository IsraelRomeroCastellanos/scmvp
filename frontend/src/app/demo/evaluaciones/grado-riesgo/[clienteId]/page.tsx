import { notFound } from "next/navigation";
import { isDemoEvaluacionesEnabled } from "@/demo-evaluaciones/isEnabled";
import { DemoPageShell } from "@/demo-evaluaciones/ui/pageShell";
import { EvaluationForm } from "@/demo-evaluaciones/ui/EvaluationForm";
import { gradoRiesgoConfig } from "@/demo-evaluaciones/config/gradoRiesgo";

export default function GradoRiesgoDemoPage({
  params,
}: {
  params: { clienteId: string };
}) {
  if (!isDemoEvaluacionesEnabled()) notFound();

  return (
    <DemoPageShell title="Grado de Riesgo de Cliente (Demo)" subtitle={`Cliente ID: ${params.clienteId}`}>
      <EvaluationForm config={gradoRiesgoConfig} clienteId={params.clienteId} />
    </DemoPageShell>
  );
}
