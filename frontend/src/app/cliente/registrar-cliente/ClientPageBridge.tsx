"use client";

import React from "react";
import ClientPage from "./ClientPage";

const SafeClientPage: React.ComponentType<any> = ClientPage as any;

export default function ClientPageBridge(): JSX.Element {
  return <SafeClientPage />;
}
