import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import IframeCommunicator from "./IframeCommunicator";

export default function Custom() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <IframeCommunicator />
    </>
  );
}
