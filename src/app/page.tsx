import { NightlifeApp } from "@/components/sites/afterhours/nightlife-app";

export const dynamic = "force-dynamic";

export default function Home() {
  return <NightlifeApp now={new Date().toISOString()} />;
}
