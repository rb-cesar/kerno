import { redirect } from "next/navigation";

export default async function ProjectIndexPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = await params;
  redirect(`/w/${slug}/p/${projectId}/kanban`);
}
