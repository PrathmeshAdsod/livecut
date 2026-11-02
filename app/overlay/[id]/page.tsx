import { Broadcast } from "@/components/broadcast";
export default async function OverlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Broadcast id={(await params).id} />;
}
