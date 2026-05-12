import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <ShieldAlert size={64} className="text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">403</h1>
        <p className="text-text-secondary mb-6">你没有权限访问此页面</p>
        <Link to="/" className="px-4 py-2 bg-accent text-white rounded-btn hover:bg-accent-hover transition-colors">
          返回看板
        </Link>
      </div>
    </div>
  );
}
