// components/tasks/FocusMode.tsx
import { Task } from '../../types';
import TaskItem from './TaskItem';
import { Target, Sparkles } from 'lucide-react';

interface FocusModeProps {
  tasks: Task[];
  onTasksChange: () => void;
  onStartTimer: (task: Task) => void;
}

export default function FocusMode({ tasks, onTasksChange, onStartTimer }: FocusModeProps) {
  const focusTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 3);

  const completedToday = tasks.filter(
    t => t.status === 'done' && t.due_date === new Date().toISOString().split('T')[0]
  ).length;

  if (focusTasks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-xl shadow-lg text-center mt-6">
        <Sparkles className="w-16 h-16 mx-auto mb-4 animate-pulse" />
        <h2 className="text-3xl font-bold mb-2">Gotowe!</h2>
        <p className="text-lg">
          Wszystkie zadania ukończone. Świetna robota!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Focus</h2>
        </div>
        <p className="text-sm opacity-90">
          {focusTasks.length} {focusTasks.length === 1 ? 'zadanie' : focusTasks.length >= 5 ? 'zadań' : 'zadania'} do wykonania
        </p>
      </div>

      <div className="space-y-3">
        {focusTasks.map((task, index) => (
          <div key={task.id} className="relative">
            {/* Number Badge */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg z-10 border-4 border-white">
              {index + 1}
            </div>
            <div className="pl-4 gap-4">
              <TaskItem
                task={task}
                onTasksChange={onTasksChange}
                onStartTimer={() => onStartTimer(task)}
              />
            </div>
          </div>
        ))}
      </div>

      {tasks.filter(t => t.status !== 'done').length > 3 && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500 mb-2">
            +{tasks.filter(t => t.status !== 'done').length - 3} więcej
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Najpierw ukończ te, a potem pokażemy Ci więcej!
          </p>
        </div>
      )}
    </div>
  );
}