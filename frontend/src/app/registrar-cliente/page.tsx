import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RegistrarClienteLegacyPage() {
  redirect('/cliente/registrar-cliente');
}
