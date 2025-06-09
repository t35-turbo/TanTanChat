import { createFileRoute, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/chat/$chatId')({
  component: RouteComponent,
 // TODO: Add the loader
})

function RouteComponent() {
  const { chatId } = useParams({ from: '/chat/$chatId' })

  return (
    <div>
      <h3>Chat Room: {chatId}</h3>
      <p>You are now in chat "{chatId}"</p>
    </div>
  )
}
