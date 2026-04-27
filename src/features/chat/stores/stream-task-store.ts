"use client";

import { create } from "zustand";

export type StreamTaskStatus =
  | "pending"
  | "streaming"
  | "done"
  | "error"
  | "aborted"
  | "quota_exceeded";

export type StreamTask = {
  streamId: string;
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: StreamTaskStatus;
  startedAt: number;
  lastEventId?: number;
  error?: string;
};

type StreamTaskStore = {
  tasksById: Record<string, StreamTask>;
  activeStreamIdsByChat: Record<string, string[]>;
  startTask: (task: StreamTask) => void;
  updateTask: (streamId: string, updater: (task: StreamTask) => StreamTask) => void;
  completeTask: (
    streamId: string,
    status: Exclude<StreamTaskStatus, "pending" | "streaming">,
    error?: string
  ) => void;
  moveChatTasks: (fromChatId: string, toChatId: string) => void;
  reset: () => void;
};

export const useStreamTaskStore = create<StreamTaskStore>((set) => ({
  tasksById: {},
  activeStreamIdsByChat: {},
  startTask: (task) =>
    set((state) => ({
      tasksById: {
        ...state.tasksById,
        [task.streamId]: task
      },
      activeStreamIdsByChat: {
        ...state.activeStreamIdsByChat,
        [task.chatId]: [...(state.activeStreamIdsByChat[task.chatId] ?? []), task.streamId]
      }
    })),
  updateTask: (streamId, updater) =>
    set((state) => {
      const currentTask = state.tasksById[streamId];
      if (!currentTask) {
        return state;
      }

      const nextTask = updater(currentTask);
      if (nextTask.chatId === currentTask.chatId) {
        return {
          tasksById: {
            ...state.tasksById,
            [streamId]: nextTask
          }
        };
      }

      const previousChatStreams = (state.activeStreamIdsByChat[currentTask.chatId] ?? []).filter(
        (id) => id !== streamId
      );
      const nextChatStreams = [
        ...(state.activeStreamIdsByChat[nextTask.chatId] ?? []).filter((id) => id !== streamId),
        streamId
      ];
      const activeStreamIdsByChat = {
        ...state.activeStreamIdsByChat,
        [currentTask.chatId]: previousChatStreams,
        [nextTask.chatId]: nextChatStreams
      };

      if (previousChatStreams.length === 0) {
        delete activeStreamIdsByChat[currentTask.chatId];
      }

      return {
        tasksById: {
          ...state.tasksById,
          [streamId]: nextTask
        },
        activeStreamIdsByChat
      };
    }),
  completeTask: (streamId, status, error) =>
    set((state) => {
      const currentTask = state.tasksById[streamId];
      if (!currentTask) {
        return state;
      }

      const nextTask: StreamTask = {
        ...currentTask,
        status,
        error
      };
      const chatStreamIds = (state.activeStreamIdsByChat[currentTask.chatId] ?? []).filter(
        (id) => id !== streamId
      );
      const activeStreamIdsByChat = {
        ...state.activeStreamIdsByChat,
        [currentTask.chatId]: chatStreamIds
      };

      if (chatStreamIds.length === 0) {
        delete activeStreamIdsByChat[currentTask.chatId];
      }

      return {
        tasksById: {
          ...state.tasksById,
          [streamId]: nextTask
        },
        activeStreamIdsByChat
      };
    }),
  moveChatTasks: (fromChatId, toChatId) =>
    set((state) => {
      if (fromChatId === toChatId) {
        return state;
      }

      const movingStreamIds = state.activeStreamIdsByChat[fromChatId] ?? [];
      if (movingStreamIds.length === 0) {
        return state;
      }

      const tasksById = { ...state.tasksById };
      for (const streamId of movingStreamIds) {
        const task = tasksById[streamId];
        if (task) {
          tasksById[streamId] = { ...task, chatId: toChatId };
        }
      }

      const activeStreamIdsByChat = {
        ...state.activeStreamIdsByChat,
        [toChatId]: [
          ...(state.activeStreamIdsByChat[toChatId] ?? []).filter(
            (id) => !movingStreamIds.includes(id)
          ),
          ...movingStreamIds
        ]
      };
      delete activeStreamIdsByChat[fromChatId];

      return {
        tasksById,
        activeStreamIdsByChat
      };
    }),
  reset: () => ({
    tasksById: {},
    activeStreamIdsByChat: {}
  })
}));
