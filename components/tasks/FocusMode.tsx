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

  if (focusTasks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 rounded-xl shadow-lg text-center mt-6 border border-green-400/20">
        <Sparkles className="w-16 h-16 mx-auto mb-4 animate-pulse drop-shadow-sm" />
        <h2 className="text-3xl font-bold mb-2">Gotowe!</h2>
        <p className="text-lg opacity-90">Wszystkie zadania ukończone. Świetna robota!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 mt-6">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8 drop-shadow-sm" />
          <h2 className="text-2xl font-bold">Focus Mode</h2>
        </div>
        <p className="text-sm opacity-90 font-medium">
          {focusTasks.length} {focusTasks.length === 1 ? 'zadanie' : focusTasks.length >= 5 ? 'zadań' : 'zadania'} do wykonania
        </p>
      </div>

      <div className="space-y-4">
        {focusTasks.map((task, index) => (
          <div key={task.id} className="relative">
            {/* Number Badge */}
            <div className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-lg shadow-md z-10 border-4 border-background dark:border-background transition-colors">
              {index + 1}
            </div>
            <div className="pl-3 sm:pl-4">
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
        <div className="text-center pt-3 pb-2">
          <p className="text-sm font-medium text-textSecondary mb-1">
            +{tasks.filter(t => t.status !== 'done').length - 3} więcej
          </p>
          <p className="text-xs text-textSubtle">
            Najpierw ukończ te, a potem pokażemy Ci resztę!
          </p>
        </div>
      )}
    </div>
  );
}