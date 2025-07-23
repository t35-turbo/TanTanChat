import { PageBack } from '@/components/settings/BackButtons'
import { authClient } from '@/lib/auth-client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/settings')({
  component: RouteComponent,
})

function RouteComponent() {

  return <div className="flex flex-col gap-2 p-4 w-full">
    <PageBack />

    <h1 className="text-2xl font-bold p-2">Admin Settings</h1>

  </div>
}
