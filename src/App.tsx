import { ComponentType, Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ToastHost } from '@/components/ui';
import { NotFoundPage } from '@/pages/NotFoundPage';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
);
const PathPage = lazy(() =>
  import('@/pages/PathPage').then((m) => ({ default: m.PathPage })),
);
const CloudPathPage = lazy(() =>
  import('@/pages/CloudPathPage').then((m) => ({ default: m.CloudPathPage })),
);
const ModulePage = lazy(() =>
  import('@/pages/ModulePage').then((m) => ({ default: m.ModulePage })),
);
const LessonPage = lazy(() =>
  import('@/pages/LessonPage').then((m) => ({ default: m.LessonPage })),
);
const QuizPage = lazy(() =>
  import('@/pages/QuizPage').then((m) => ({ default: m.QuizPage })),
);
const LabPage = lazy(() =>
  import('@/pages/LabPage').then((m) => ({ default: m.LabPage })),
);
const EnspLabPage = lazy(() =>
  import('@/pages/EnspLabPage').then((m) => ({ default: m.EnspLabPage })),
);
const LabLibraryPage = lazy(() =>
  import('@/pages/LabLibraryPage').then((m) => ({ default: m.LabLibraryPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SearchPage = lazy(() =>
  import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const LibraryPage = lazy(() =>
  import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
);

function PageFallback() {
  return (
    <div className="empty" role="status" aria-live="polite" style={{ marginTop: 40 }}>
      <div className="t">页面加载中…</div>
    </div>
  );
}

function withSuspense(node: ComponentType) {
  const Node = node;
  return (
    <Suspense fallback={<PageFallback />}>
      <Node />
    </Suspense>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={withSuspense(HomePage)} />
          <Route path="path" element={withSuspense(PathPage)} />
          <Route path="path/cloud" element={withSuspense(CloudPathPage)} />
          <Route path="module/:moduleId" element={withSuspense(ModulePage)} />
          <Route path="lesson/:lessonId" element={withSuspense(LessonPage)} />
          <Route path="quiz" element={withSuspense(QuizPage)} />
          <Route path="lab" element={withSuspense(LabPage)} />
          <Route path="lab/ensp" element={withSuspense(EnspLabPage)} />
          <Route path="lab/library" element={withSuspense(LabLibraryPage)} />
          <Route path="dashboard" element={withSuspense(DashboardPage)} />
          <Route path="search" element={withSuspense(SearchPage)} />
          <Route path="library" element={withSuspense(LibraryPage)} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <ToastHost />
    </HashRouter>
  );
}
