import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="fade-up" style={{ paddingTop: 40 }}>
      <EmptyState title="页面不存在" hint="检查一下地址，或者回到首页继续学习" />
      <div className="hstack" style={{ justifyContent: 'center', marginTop: 18 }}>
        <Link to="/" className="btn btn-primary btn-sm">回到首页</Link>
        <Link to="/path" className="btn btn-sm">成长路径</Link>
      </div>
    </div>
  );
}
