import dynamic from "next/dynamic";

const RegistrarClienteClient = dynamic(() => import("./ClientPage"), {
  ssr: false,
});

export default function Page() {
  return <RegistrarClienteClient />;
}
