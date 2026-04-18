"use client";

import { useState } from "react";

import { BottomComposer } from "@/features/chat/components/bottom-composer";
import { ChatStage } from "@/features/chat/components/chat-stage";
import { MobileTabBar } from "@/features/chat/components/mobile-tab-bar";
import { Sidebar } from "@/features/chat/components/sidebar";
import { WorkspacePanel } from "@/features/chat/components/workspace-panel";
import { useChatWorkspace } from "@/features/chat/hooks/use-chat-workspace";
import { useBrowserSpeechInput } from "@/shared/hooks/use-browser-speech-input";
import { useUsageCredits } from "@/features/usage/hooks/use-usage-credits";
import { capabilities, suggestions, toolModes } from "@/features/chat/mock-data";
import type { CurrentUser } from "@/shared/types";

type AppShellProps = {
  currentUser: CurrentUser;
};

const QUOTA_EXCEEDED_HELPER_TEXT = "Today's quota is exhausted and will reset at midnight.";

export function AppShell({ currentUser }: AppShellProps) {
  const [composerDockOffset, setComposerDockOffset] = useState(320);
  const usage = useUsageCredits();
  const {
    chats,
    activeChatId,
    activeChat,
    activeMessages,
    activeSection,
    draft,
    activeMode,
    attachments,
    helperText,
    isGenerating,
    activeStreamCount,
    activeModel,
    isHydrating,
    setActiveSection,
    setDraft,
    setActiveMode,
    setAttachments,
    createNewChat,
    selectChat,
    renameChat,
    togglePinnedChat,
    removeChat,
    uploadAttachments,
    uploadKnowledgeDocuments,
    sendMessage,
    stopGeneration
  } = useChatWorkspace({
    isQuotaExceeded: usage.usage?.isExceeded ?? false,
    onUsageChanged: usage.refresh
  });
  const voiceInput = useBrowserSpeechInput({
    value: draft,
    onChange: setDraft
  });

  const helperContent = usage.usage?.isExceeded ? QUOTA_EXCEEDED_HELPER_TEXT : helperText;

  return (
    <div className="flex min-h-screen bg-transparent text-text-primary">
      <Sidebar
        currentUser={currentUser}
        usage={usage.usage}
        usageError={usage.error}
        isUsageLoading={usage.isLoading}
        chats={chats}
        activeChatId={activeChatId}
        activeSection={activeSection}
        onSelectChat={selectChat}
        onSelectSection={setActiveSection}
        onNewChat={() => createNewChat()}
        onRenameChat={renameChat}
        onTogglePinnedChat={togglePinnedChat}
        onDeleteChat={removeChat}
      />
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden lg:ml-[292px]">
        {activeSection === "home" ? (
          <>
            <ChatStage
              activeChat={activeChat}
              messages={activeMessages}
              composerDockOffset={composerDockOffset}
              suggestions={suggestions}
              capabilities={capabilities}
              activeStreamCount={activeStreamCount}
              activeModel={activeChat?.model ?? activeModel}
              isHydrating={isHydrating}
              onSuggestionSelect={sendMessage}
              onCapabilitySelect={(label) => setDraft(`Please enter ${label} mode and help me with:`)}
            />
            <BottomComposer
              value={draft}
              activeMode={activeMode}
              attachments={attachments}
              isGenerating={isGenerating}
              activeStreamCount={activeStreamCount}
              isRecording={voiceInput.isRecording}
              isVoiceSupported={voiceInput.isSupported}
              isQuotaExceeded={usage.usage?.isExceeded ?? false}
              helperText={helperContent}
              modes={toolModes}
              onChange={setDraft}
              onModeChange={setActiveMode}
              onAttachFiles={(files) => void uploadAttachments(files)}
              onUploadKnowledge={(files) => void uploadKnowledgeDocuments(files)}
              onRemoveAttachment={(attachmentId) =>
                setAttachments((current) => current.filter((item) => item.id !== attachmentId))
              }
              onDockOffsetChange={setComposerDockOffset}
              onVoiceToggle={voiceInput.toggle}
              onSend={() => void sendMessage()}
              onStop={stopGeneration}
            />
          </>
        ) : (
          <main className="relative flex flex-1 flex-col overflow-hidden px-5 pb-20 pt-8 lg:px-10">
            <WorkspacePanel section={activeSection} />
          </main>
        )}
        <MobileTabBar />
      </div>
    </div>
  );
}
