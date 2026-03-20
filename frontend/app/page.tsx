import NegotiationForgeApp from "@/components/NegotiationForgeApp";
import { getScenarioCatalog } from "@/lib/scenario-catalog";

export default async function Home() {
  const scenarioCatalog = await getScenarioCatalog();

  return <NegotiationForgeApp scenarioCatalog={scenarioCatalog} />;
}
