import { nanoid } from "@/lib/utils";
import ChatExperimental from "@/components/chat-experimental";

export const runtime = "edge";

export default function IndexPage() {
  const id = nanoid();

  return <ChatExperimental />;
}
