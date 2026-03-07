"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Task, TaskStatus } from "@/lib/stores/taskStore";
import TaskCard from "./TaskCard";
import TaskEditModal from "./TaskEditModal";

const TASK_STAGES: { id: TaskStatus; label: string; color: string }[] = [
  { id: "inbox", label: "Inbox", color: "border-t-gray-500" },
  { id: "backlog", label: "Backlog", color: "border-t-gray-600" },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { id: "review", label: "Review", color: "border-t-purple-500" },
  { id: "quality_review", label: "Quality Review", color: "border-t-indigo-500" },
  { id: "blocked", label: "Blocked", color: "border-t-amber-500" },
  { id: "done", label: "Done", color: "border-t-green-500" },
];

const PRIORITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 };

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

interface TaskKanbanProps {
  tasks: Task[];
  agents: Agent[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  refresh: () => void;
}

export default function TaskKanban({
  tasks,
  agents,
  onStatusChange,
  refresh,
}: TaskKanbanProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId = result.draggableId;
    if (result.source.droppableId !== newStatus) {
      await onStatusChange(taskId, newStatus);
    }
  };

  const handleEditComplete = () => {
    setEditingTask(null);
    setAddTaskOpen(false);
    refresh();
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBulkMove = async (newStatus: TaskStatus) => {
    for (const taskId of selectedTasks) {
      await onStatusChange(taskId, newStatus);
    }
    setSelectedTasks(new Set());
    setBulkMode(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedTasks(new Set()); }}
            className={`px-3 py-2 text-sm font-mono rounded-lg transition-colors ${
              bulkMode ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300 bg-gray-800/50"
            }`}
          >
            {bulkMode ? "Cancel Bulk" : "Bulk"}
          </button>
        </div>

        {bulkMode && selectedTasks.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-mono">{selectedTasks.size} selected</span>
            {TASK_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleBulkMove(stage.id)}
                className="px-2 py-1 text-[10px] font-mono text-gray-400 bg-gray-800 rounded hover:bg-gray-700 hover:text-gray-200"
              >
                {stage.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {TASK_STAGES.map((stage) => {
            const stageTasks = tasks
              .filter((t) => t.status === stage.id)
              .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));

            return (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-56 flex flex-col rounded-lg border transition-colors ${
                      snapshot.isDraggingOver
                        ? "border-cyan-500/50 bg-cyan-500/5"
                        : "border-gray-800 bg-gray-900/30"
                    }`}
                  >
                    <div className={`px-3 py-2 border-t-2 rounded-t-lg ${stage.color}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                          {stage.label}
                        </h3>
                        <span className="text-[10px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                          {stageTasks.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                      {stageTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`${dragSnapshot.isDragging ? "opacity-80 shadow-lg" : ""} ${
                                bulkMode && selectedTasks.has(task.id) ? "ring-2 ring-cyan-500" : ""
                              }`}
                            >
                              <TaskCard
                                task={task}
                                onClick={() =>
                                  bulkMode ? toggleTaskSelection(task.id) : setEditingTask(task)
                                }
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageTasks.length === 0 && (
                        <div className="text-xs text-gray-700 text-center py-4 font-mono">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {(editingTask || addTaskOpen) && (
        <TaskEditModal
          task={addTaskOpen ? null : editingTask}
          agents={agents}
          onClose={() => { setEditingTask(null); setAddTaskOpen(false); }}
          onSaved={handleEditComplete}
        />
      )}
    </>
  );
}
