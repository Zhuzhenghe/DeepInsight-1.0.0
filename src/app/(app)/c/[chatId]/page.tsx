import ChatWindow from '@/components/ChatWindow';

interface PageProps {
  params: Promise<{ chatId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { chatId } = await params;
  return <ChatWindow id={chatId} />;
};

export default Page;
