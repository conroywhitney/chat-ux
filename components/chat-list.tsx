import { type Message } from 'ai'

import { Separator } from '@/components/ui/separator'
import { ChatMessage } from '@/components/chat-message'

interface ComponentArgs {
  [key: string]: any
}

export interface ChatList {
  messages: Message[]
}

const renderComponent = ({
  name,
  arguments: args
}: {
  name: string
  arguments: string
}) => {
  const componentName = name.replace('render_', '')
  const Component =
    require(`@/components/chat-components/${componentName}`).default

  const componentArgs: ComponentArgs = JSON.parse(args)

  return <Component {...componentArgs} />
}

const renderMessage = (message: Message, index: number) => {
  const isComponent = message.content.includes('render_')

  return (
    <div key={index}>
      {isComponent && renderComponent(JSON.parse(message.content))}
      {!isComponent && <ChatMessage message={message} />}
      <Separator className="my-4 md:my-8" />
    </div>
  )
}

export function ChatList({ messages }: ChatList) {
  if (!messages.length) return null

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map(renderMessage)}
    </div>
  )
}
