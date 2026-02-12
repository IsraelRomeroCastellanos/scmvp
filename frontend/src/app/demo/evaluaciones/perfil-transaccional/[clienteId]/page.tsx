import { notFound } from "next/navigation";
import { isDemoEvaluacionesEnabled } from "@/demo-evaluaciones/isEnabled";
import { DemoPageShell } from "@/demo-evaluaciones/ui/pageShell";
import { EvaluationForm } from "@/demo-evaluaciones/ui/EvaluationForm";
import { perfilTransaccionalConfig } from "@/demo-evaluaciones/config/perfilTransaccional";

export default function PerfilTransaccionalDemoPage({
  params,
}: {
  params: { clienteId: string };
}) {
  if (!isDemoEvaluacionesEnabled()) notFound();

  return (
    <DemoPageShell title="Perfil Transaccional (Demo)" subtitle={`Cliente ID: ${params.clienteId}`}>
      <EvaluationForm config={perfilTransaccionalConfig} clienteId={params.clienteId} />
    </DemoPageShell>
  );
}
