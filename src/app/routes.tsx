/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { Root } from "./pages/Root";

// ── Lazy load tất cả pages nặng — chỉ tải khi user điều hướng đến ──
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const TimesheetHub = lazy(() =>
  import("./pages/TimesheetHub").then((m) => ({ default: m.TimesheetHub })),
);
const MasterAE = lazy(() =>
  import("./pages/MasterAE").then((m) => ({ default: m.MasterAE })),
);
const Audit = lazy(() =>
  import("./pages/Audit").then((m) => ({ default: m.Audit })),
);
const BulkPayment = lazy(() =>
  import("./pages/BulkPayment").then((m) => ({ default: m.BulkPayment })),
);
const PivotSheet = lazy(() =>
  import("./pages/PivotSheet").then((m) => ({ default: m.PivotSheet })),
);
const AEDataConfig = lazy(() =>
  import("./pages/AEDataConfig").then((m) => ({ default: m.AEDataConfig })),
);

// Wrapper nhẹ — fallback spinner trong suốt, không layout shift
function LazyPage({ Component }: { Component: React.ComponentType }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <LazyPage Component={Dashboard} /> },
      { path: "centers", element: <LazyPage Component={TimesheetHub} /> },
      { path: "master-ae", element: <LazyPage Component={MasterAE} /> },
      { path: "audit", element: <LazyPage Component={Audit} /> },
      { path: "payment", element: <LazyPage Component={BulkPayment} /> },
      { path: "pivot", element: <LazyPage Component={PivotSheet} /> },
      { path: "config/ae", element: <LazyPage Component={AEDataConfig} /> },
    ],
  },
]);
