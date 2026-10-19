// components/tasks/TaskEditForm.tsx
//
// Formularz edycji zadania (wydzielony z TaskItem – osobny plik, mniejszy komponent listy).

import React from "react";
import { Minus, Plus } from "lucide-react";
import { Task } from "@/types/tasks";
import { FormButtons } from "../ui/CommonButtons";
import { taskCategoryOptions } from "@/lib/taskCategories";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import TaskRemindersEditor from "./TaskRemindersEditor";
import RecurrenceEditor from "../ui/RecurrenceEditor";
import { taskRecurrenceFields, taskRule } from "@/lib/taskRecurrence";

export default function TaskEditForm({
  task,
  editedTask,
  setEditedTask,
  sharedEmail,
  setSharedEmail,
  userOptions,
  handleSaveEdit,
  handleCancelEdit,
  increasePriority,
  decreasePriority,
  titleRef,
  loading,
  reminders,
  setReminders,
  remindersLoaded,
}: Readonly<{
  task: Task;
  editedTask: Task;
  setEditedTask: React.Dispatch<React.SetStateAction<Task>>;
  sharedEmail: string;
  setSharedEmail: (val: string) => void;
  userOptions: string[];
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  increasePriority: () => void;
  decreasePriority: () => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  reminders: string[];
  setReminders: (next: string[]) => void;
  remindersLoaded: boolean;
}>) {
  const userCategories = useTaskCategories();
  const editPrefix = `edit-task-${task.id}`;

  return (
    <div className="card w-full rounded-xl p-4">
      <div className="space-y-3">
        <div>
          <label htmlFor={`${editPrefix}-title`} className="form-label">
            Tytuł zadania:
          </label>
          <input
            id={`${editPrefix}-title`}
            ref={titleRef}
            type="text"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            className="input-field font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="form-label">Priorytet:</div>
            <div className="mt-1 flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={decreasePriority}
                aria-label="Zmniejsz priorytet"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <output
                aria-live="polite"
                aria-label={`Priorytet ${editedTask.priority}`}
                className="card flex flex-1 items-center justify-center rounded-lg text-lg text-text"
              >
                {editedTask.priority}
              </output>
              <button
                type="button"
                onClick={increasePriority}
                aria-label="Zwiększ priorytet"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor={`${editPrefix}-category`} className="form-label">
              Kategoria:
            </label>
            <select
              id={`${editPrefix}-category`}
              value={editedTask.category}
              onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
              className="input-field"
            >
              {taskCategoryOptions(userCategories, task.category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${editPrefix}-date`} className="form-label">
              Data wykonania:
            </label>
            <input
              id={`${editPrefix}-date`}
              type="date"
              value={editedTask.due_date}
              onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
              className="input-field w-full min-w-0 px-2"
            />
          </div>
          {userOptions.length > 0 && (
            <div>
              <label htmlFor={`${editPrefix}-share`} className="form-label">
                Udostępnij dla:
              </label>
              <select
                id={`${editPrefix}-share`}
                value={sharedEmail}
                onChange={(e) => setSharedEmail(e.target.value)}
                className="input-field"
              >
                <option value="">Tylko dla mnie</option>
                {userOptions.map((email: string) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <RecurrenceEditor
          idPrefix={`${editPrefix}-recurrence`}
          value={taskRule(editedTask)}
          onChange={(rule) => setEditedTask({ ...editedTask, ...taskRecurrenceFields(rule) })}
          startDay={editedTask.due_date}
          allowCount={false}
          disabled={loading}
        />
        {remindersLoaded ? (
          <TaskRemindersEditor
            value={reminders}
            onChange={setReminders}
            dueDate={editedTask.due_date}
            disabled={loading}
          />
        ) : (
          <p className="text-sm text-text-secondary">Wczytuję przypomnienia…</p>
        )}
        <div>
          <label htmlFor={`${editPrefix}-desc`} className="form-label">
            Opis:
          </label>
          <textarea
            id={`${editPrefix}-desc`}
            value={editedTask.description || ""}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            className="input-field"
            rows={2}
          />
        </div>
        <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
      </div>
    </div>
  );
}
