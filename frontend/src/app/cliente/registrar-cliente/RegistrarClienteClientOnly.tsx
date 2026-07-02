"use client";

import dynamicImport from "next/dynamic";

const RegistrarClienteClient = dynamicImport(() => import("./ClientPage"), {
  ssr: false,
});

export default function RegistrarClienteClientOnly() {
  return <RegistrarClienteClient />;
}
