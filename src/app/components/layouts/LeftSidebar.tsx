/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation } from "react-router";
import {
  ListChecks,
  Users,
  ChevronRight,
  Banknote,
  RefreshCw,
  Flower2,
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Database,
  Wrench,
  X,
  Building2,
  Table2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  onOpenSettings?: () => void;
}

const navItems: { to: string; icon: React.ElementType; label: string }[] = [
  { to: "/timesheet-summary", icon: Building2, label: "Roster" },
  { to: "/centers", icon: BarChart3, label: "Timesheet" },
  { to: "/audit", icon: ShieldCheck, label: "Audit" },
  { to: "/master-ae", icon: Database, label: "Master AE" },
  { to: "/pivot", icon: Table2, label: "Pivot" },
];

export function LeftSidebar({
  isCollapsed,
  onToggle,
  onCloseMobile,
  onOpenSettings,
}: SidebarProps) {
  const location = useLocation();

  return (
    <motion.div className="relative h-full shrink-0 flex flex-col z-50 bg-transparent">
      {/* Logo Section */}
      <div
        style={{ padding: "12px", marginBottom: "12px" }}
        className="flex items-center justify-center w-full relative z-10 bg-transparent"
      >
        <Link
          to="/"
          className="flex items-center shrink-0 relative transition-all duration-300 hover:scale-105 gap-2 group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/40 transition-all duration-300" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white relative z-10 shadow-sm border border-white/50">
              <Banknote className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
          </div>
          <div className="flex flex-col ml-1 justify-center relative">
            <span className="font-display text-[22px] font-black tracking-widest text-foreground leading-none uppercase drop-shadow-sm">Payroll</span>
            <span className="font-sans text-[9px] font-bold tracking-[0.25em] uppercase text-primary leading-none mt-1">Management</span>
          </div>
        </Link>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden absolute top-0 right-0 bg-destructive text-white p-1 rounded-bl-lg"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col items-center gap-4 py-4 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Tooltip key={item.to} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  style={{ width: "56px", height: "56px" }}
                  className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-primary/20"
                      : "bg-transparent text-slate-500 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"} transition-colors`}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-primary text-white font-bold text-[0.65rem] uppercase px-3 py-1.5 rounded-lg border-none"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Settings at Bottom */}
      <div className="mt-auto p-4 w-full flex flex-col items-center relative z-10 pb-8">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenSettings}
              style={{ width: "56px", height: "56px" }}
              className="flex items-center justify-center rounded-2xl transition-colors duration-300 text-slate-500 hover:bg-primary/5 hover:text-primary"
            >
              <Wrench className="w-5 h-5 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-primary text-white font-bold text-[0.65rem] uppercase px-3 py-1.5 rounded-lg border-none"
          >
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
