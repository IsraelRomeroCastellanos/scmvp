import { notFound } from "next/navigation";
import { isDemoEvaluacionesEnabled } from "@/demo-evaluaciones/isEnabled";
import { DemoPageShell } from "@/demo-evaluaciones/ui/pageShell";
import { EvaluationForm } from "@/demo-evaluaciones/ui/EvaluationForm";
import { gradoRiesgoConfig } from "@/demo-evaluaciones/config/gradoRiesgo";

export default async function GradoRiesgoDemoPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;

  if (!isDemoEvaluacionesEnabled()) notFound();

  return (
    <DemoPageShell title="Grado de Riesgo de Cliente" subtitle={`Cliente ID: ${clienteId}`}>
      <EvaluationForm config={gradoRiesgoConfig} clienteId={clienteId} />
    </DemoPageShell>
  );
}
