import { Viewer } from "@/components/viewer";
export default async function ViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Viewer id={(await params).id} />;
}
