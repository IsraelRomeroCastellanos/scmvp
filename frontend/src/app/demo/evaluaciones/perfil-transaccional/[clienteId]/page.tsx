import { notFound } from "next/navigation";
import { isDemoEvaluacionesEnabled } from "@/demo-evaluaciones/isEnabled";
import { DemoPageShell } from "@/demo-evaluaciones/ui/pageShell";
import { EvaluationForm } from "@/demo-evaluaciones/ui/EvaluationForm";
import { perfilTransaccionalConfig } from "@/demo-evaluaciones/config/perfilTransaccional";

export default async function PerfilTransaccionalDemoPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;

  if (!isDemoEvaluacionesEnabled()) notFound();

  return (
    <DemoPageShell title="Perfil Transaccional" subtitle={`Cliente ID: ${clienteId}`}>
      <EvaluationForm config={perfilTransaccionalConfig} clienteId={clienteId} />
    </DemoPageShell>
  );
}
