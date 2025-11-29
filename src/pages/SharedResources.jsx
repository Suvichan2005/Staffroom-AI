import { PageShell } from "../components/layout";
import { ResourceGallery, defaultResources } from "../components/shared";

export default function SharedResources() {
  return (
    <PageShell width="6xl">
      <ResourceGallery
        resources={defaultResources}
        title="Shared Resources"
        allowUpload
        className="sc-card"
      />
    </PageShell>
  );
}