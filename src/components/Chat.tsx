'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import MessageInput from './MessageInput';
import { File, Message } from './ChatWindow';
import MessageBox from './MessageBox';
import MessageBoxLoading from './MessageBoxLoading';
import { useTranslations } from '@/lib/i18n';

const Chat = ({
  loading,
  messages,
  sendMessage,
  messageAppeared,
  rewrite,
  fileIds,
  setFileIds,
  files,
  setFiles,
}: {
  messages: Message[];
  sendMessage: (message: string) => void;
  loading: boolean;
  messageAppeared: boolean;
  rewrite: (messageId: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: File[];
  setFiles: (files: File[]) => void;
}) => {
  const [dividerWidth, setDividerWidth] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslations();

  // 检测用户是否在底部附近
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 如果用户在底部100px范围内，则允许自动滚动
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 100;
      setShouldAutoScroll(isNearBottom);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateDividerWidth = () => {
      if (dividerRef.current) {
        setDividerWidth(dividerRef.current.scrollWidth);
      }
    };

    updateDividerWidth();

    window.addEventListener('resize', updateDividerWidth);

    return () => {
      window.removeEventListener('resize', updateDividerWidth);
    };
  });

  // 用于检测推荐是否被添加
  const prevMessagesRef = useRef<Message[]>([]);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    const scroll = () => {
      messageEnd.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (messages.length === 0) {
      // 没有消息时使用默认聊天标题
      document.title = t('meta.chatTitle');
    } else if (messages.length === 1) {
      // 有一条消息时使用消息内容作为标题
      document.title = `${messages[0].content.substring(0, 30)} - ${t('meta.productName')}`;
    }

    const lastMessage = messages[messages.length - 1];
    const prevLastMessage = prevMessagesRef.current[prevMessagesRef.current.length - 1];
    
    // 检测是否有推荐被添加
    const suggestionsAdded = lastMessage && prevLastMessage && 
      lastMessage.messageId === prevLastMessage.messageId &&
      !prevLastMessage.suggestions && 
      lastMessage.suggestions && 
      lastMessage.suggestions.length > 0;
    
    // 检测loading从true变为false（消息完成）
    const messageJustCompleted = prevLoadingRef.current && !loading && 
      lastMessage && lastMessage.role === 'assistant';
    
    // 滚动条件：
    // 1. 用户刚发送消息（总是滚动）
    // 2. 正在加载且有消息出现，且用户在底部附近
    // 3. AI助手的消息正在更新，且用户在底部附近
    // 4. 消息刚完成（确保按钮区域不被输入框遮挡）
    if (
      lastMessage?.role === 'user' ||
      (loading && messageAppeared && shouldAutoScroll) ||
      (lastMessage?.role === 'assistant' && loading && shouldAutoScroll) ||
      (messageJustCompleted && shouldAutoScroll)
    ) {
      scroll();
    } else if (suggestionsAdded && shouldAutoScroll) {
      // 推荐添加时延迟一点滚动，确保DOM完全更新
      setTimeout(scroll, 100);
    }

    // 更新之前的状态引用
    prevMessagesRef.current = messages;
    prevLoadingRef.current = loading;
  }, [messages, loading, messageAppeared, shouldAutoScroll, t]);

  return (
    <div className="flex flex-col space-y-6 pt-8 pb-44 lg:pb-32 sm:mx-4 md:mx-8">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;

        return (
          <Fragment key={msg.messageId}>
            <MessageBox
              key={i}
              message={msg}
              messageIndex={i}
              history={messages}
              loading={loading}
              dividerRef={isLast ? dividerRef : undefined}
              isLast={isLast}
              rewrite={rewrite}
              sendMessage={sendMessage}
            />
            {!isLast && msg.role === 'assistant' && (
              <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
            )}
          </Fragment>
        );
      })}
      {loading && !messageAppeared && <MessageBoxLoading />}
      <div ref={messageEnd} className="h-0" />
      {dividerWidth > 0 && (
        <div
          className="bottom-24 lg:bottom-10 fixed z-40"
          style={{ width: dividerWidth }}
        >
          <MessageInput
            loading={loading}
            sendMessage={sendMessage}
            fileIds={fileIds}
            setFileIds={setFileIds}
            files={files}
            setFiles={setFiles}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;
