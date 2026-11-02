import { Broadcast } from "@/components/broadcast";
export default async function RevealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Broadcast id={(await params).id} cinematic />;
}
