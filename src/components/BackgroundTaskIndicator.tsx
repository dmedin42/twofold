import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackgroundTasks, BackgroundTask } from '@/contexts/BackgroundTaskContext';
import { Loader2, X, CheckCircle, AlertCircle, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TaskIcon: React.FC<{ task: BackgroundTask }> = ({ task }) => {
  switch (task.status) {
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-primary" />;
    case 'failed':
    case 'cancelled':
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return <ChefHat className="w-4 h-4" />;
  }
};

const getTaskStatusText = (task: BackgroundTask): string => {
  switch (task.status) {
    case 'running':
      return 'Processing...';
    case 'completed':
      if (task.type === 'scan') return 'Tap to review items';
      if (task.type === 'recipe') return 'Tap to review recipe';
      return 'Done!';
    case 'failed':
      return task.error || 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
};

const BackgroundTaskIndicator: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, cancelTask, clearTask } = useBackgroundTasks();
  
  // Only show recent tasks (running or completed within last 30 seconds)
  const visibleTasks = tasks.filter(t => 
    t.status === 'running' || 
    (t.completedAt && Date.now() - t.completedAt < 30000)
  );

  const handleTaskClick = (task: BackgroundTask) => {
    if (task.status === 'completed') {
      if (task.type === 'scan') {
        navigate(`/checkin?taskId=${task.id}`);
      } else if (task.type === 'recipe') {
        navigate(`/recipes?tab=ai&taskId=${task.id}`);
      }
    }
  };

  if (visibleTasks.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visibleTasks.map(task => (
        <div
          key={task.id}
          onClick={() => handleTaskClick(task)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated",
            "animate-in slide-in-from-right-4 duration-300",
            "bg-card border border-border",
            task.status === 'completed' && "cursor-pointer hover:bg-accent/50 transition-colors"
          )}
        >
          <TaskIcon task={task} />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              {getTaskStatusText(task)}
            </p>
          </div>

          {task.status === 'running' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                cancelTask(task.id);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                clearTask(task.id);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default BackgroundTaskIndicator;
