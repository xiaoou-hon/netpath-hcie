import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { modules } from '@/data/curriculum';
import { overallProgress, setTheme, useLearning } from '@/store/learningStore';
import { Icon, ProgressBar } from '@/components/ui';

const mainNav = [
  { to: '/', label: '学习首页', icon: 'home', end: true },
  { to: '/path', label: '成长路径', icon: 'map', end: true },
  { to: '/path/cloud', label: '云网转型', icon: 'bolt' },
  { to: '/dashboard', label: '我的仪表盘', icon: 'chart' },
  { to: '/quiz', label: '测验中心', icon: 'quiz' },
  { to: '/lab', label: '故障排查实训', icon: 'lab', end: true },
  { to: '/library', label: '收藏与笔记', icon: 'bookmark' },
];

const NAV_COLLAPSE_KEY = 'netpath:nav-collapsed';

function loadNavCollapsed(): boolean {
  try {
    return window.localStorage.getItem(NAV_COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell() {
  const learning = useLearning();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(loadNavCollapsed);
  const progress = overallProgress();

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_COLLAPSE_KEY, navCollapsed ? '1' : '0');
    } catch {
      /* 存储不可用时忽略，仅当前会话生效 */
    }
  }, [navCollapsed]);

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', learning.theme);
  }, [learning.theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className={`app-shell${navCollapsed ? ' nav-collapsed' : ''}`}>
      <aside
        className={`sidebar${drawerOpen ? ' open' : ''}${navCollapsed ? ' collapsed' : ''}`}
        aria-label="主导航"
      >
        <div className="sidebar-head">
          <Link to="/" className="brand" aria-label="NetPath 首页">
            <span className="brand-mark">NP</span>
            <span className="brand-copy">
              <div className="brand-name">NetPath</div>
              <div className="brand-sub">网络工程师成长引擎</div>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setNavCollapsed((value) => !value)}
            aria-label={navCollapsed ? '展开导航栏' : '收起导航栏'}
            aria-expanded={!navCollapsed}
            title={navCollapsed ? '展开导航栏' : '收起导航栏'}
          >
            <Icon name={navCollapsed ? 'next' : 'prev'} size={16} />
          </button>
        </div>

        <nav className="nav-group">
          <div className="nav-group-title">学习</div>
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              aria-label={navCollapsed ? item.label : undefined}
              title={navCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={17} className="nav-ico" />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="nav-group nav-modules">
          <div className="nav-group-title">课程模块</div>
          {modules.length === 0 ? <div className="tiny faint" style={{ padding: '4px 10px' }}>课程内容加载中</div> : null}
          {modules.map((m) => (
            <NavLink
              key={m.id}
              to={`/module/${m.id}`}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              title={`${m.code} ${m.title}`}
            >
              <span className="mono tiny faint" style={{ width: 26 }}>{m.code}</span>
              <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
              <span className="nav-count">{m.lessons.length}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-progress">
          <div className="row">
            <span>总进度</span>
            <span className="mono">{Math.round(progress.ratio * 100)}%</span>
          </div>
          <ProgressBar value={progress.ratio} thin label="总学习进度" />
          <div className="row" style={{ marginTop: 8, marginBottom: 0 }}>
            <span className="tiny faint">
              {progress.completed} / {progress.total} 课时
            </span>
          </div>
        </div>
      </aside>

      {drawerOpen ? <div className="backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" /> : null}

      <div className="main-col">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn drawer-toggle"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={18} />
          </button>

          <button
            type="button"
            className="topbar-search"
            onClick={() => navigate('/search')}
            aria-label="搜索课程、命令、知识点"
          >
            <Icon name="search" size={15} />
            <span>搜索知识点、命令、排错场景…</span>
            <span className="spacer" />
            <span className="kbd hide-sm">/</span>
          </button>

          <div className="topbar-actions">
            <Link to="/path" className="badge accent hide-sm" style={{ padding: '4px 10px' }}>
              <Icon name="target" size={12} /> HCIE-Datacom
            </Link>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(learning.theme === 'dark' ? 'light' : 'dark')}
              aria-label={learning.theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
            >
              <Icon name={learning.theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
