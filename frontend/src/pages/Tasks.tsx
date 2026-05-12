import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Circle, Clock,
  Calendar, ArrowRight, Trash2, Filter,
} from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Task {
  id: number;
  title: string;
  description: string;
  source_announcement_id: number | null;
  source_quote: string;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-600',
  medium: 'bg-amber-500/10 text-amber-600',
  high: 'bg-rose-500/10 text-rose-600',
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle size={18} className="text-text-tertiary" />,
  in_progress: <Clock size={18} className="text-amber-500" />,
  done: <CheckCircle2 size={18} className="text-emerald-500" />,
};

export function Tasks() {
  const { requestConfirm: confirm, cancel, state: confirmState } = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [, _setView] = useState<'list' | 'board'>('list');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    try {
      const res = await api.get(`/api/tasks?${params}`);
      setTasks(res.data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  if (loading && tasks.length === 0) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

  const handleToggleStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    try {
      await api.put(`/api/tasks/${task.id}`, { status: next });
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    } catch {
      showToast('更新失败', 'error');
    }
  };

  const handleDelete = async (taskId: number) => {
    const ok = await confirm('删除任务', '确定删除此任务吗？', 'danger');
    if (!ok) return;
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'todo', label: '待办' },
    { key: 'in_progress', label: '进行中' },
    { key: 'done', label: '已完成' },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">我的任务</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            共 {tasks.length} 条任务
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-tag text-sm transition-colors ${
              filter === f.key
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <Filter size={48} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">暂无任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="card p-4 flex items-start gap-3"
            >
              <button
                onClick={() => handleToggleStatus(task)}
                className="mt-0.5 shrink-0"
              >
                {statusIcons[task.status] || statusIcons.todo}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-text-primary">
                    {task.title}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-tag ${priorityColors[task.priority] || ''}`}
                  >
                    {priorityLabels[task.priority] || task.priority}
                  </span>
                </div>
                {task.source_announcement_id && (
                  <Link
                    to={`/announcements/${task.source_announcement_id}`}
                    className="text-xs text-accent hover:underline flex items-center gap-1 mb-1"
                  >
                    来自公告 <ArrowRight size={10} />
                  </Link>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Calendar size={10} />
                    {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                className="p-1 text-text-tertiary hover:text-danger shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={cancel}
      />
    </div>
  );
}
