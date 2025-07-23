import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/keys')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/keys"!</div>
}
