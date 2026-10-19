import { CityPage } from "@/components/sites/afterhours/city-page";

export default function Home() {
  return <CityPage now={new Date().toISOString()} />;
}
