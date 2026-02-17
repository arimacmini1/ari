import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Plugins - AEI",
  description: "Manage plugins for AI Engineering Interface",
}

export default function PluginsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <p className="text-muted-foreground">Manage plugins for AI Engineering Interface</p>
      </div>
      
      <div className="text-center py-10">
        <p className="text-muted-foreground">No plugins installed yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Plugins extend ARI's capabilities.
        </p>
      </div>
    </div>
  )
}
