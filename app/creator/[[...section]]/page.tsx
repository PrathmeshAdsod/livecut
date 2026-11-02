import { CreatorWorkspace } from "@/components/workspace";
export default async function CreatorPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return <CreatorWorkspace section={(await params).section} />;
}
