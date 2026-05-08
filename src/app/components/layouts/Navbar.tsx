/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation } from "react-router";
import {
  Coins,
  Building2,
  Database,
  ShieldCheck,
  CreditCard,
  Table2,
  Bell,
  User,
  Settings,
  Trash2,
  Menu,
  ListChecks,
  Users,
  BarChart3,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const navigationItems = [
  { id: "centers", label: "Timesheet", icon: BarChart3, path: "/centers" },
  { id: "audit", label: "Audit", icon: ShieldCheck, path: "/audit" },
  { id: "master-ae", label: "Master AE", icon: Database, path: "/master-ae" },
  { id: "pivot", label: "Pivot", icon: Table2, path: "/pivot" },
];

const configItems = [
  { to: "/config/centers", icon: ListChecks, label: "Centers Data" },
  { to: "/config/ae", icon: Users, label: "AE Data" },
];

interface NavbarProps {
  onToggleMobileMenu: () => void;
  onOpenSettings: () => void;
}

export function Navbar({ onToggleMobileMenu, onOpenSettings }: NavbarProps) {
  const location = useLocation();

  return (
    <div className="h-16 flex items-center px-0 gap-6 bg-transparent shrink-0">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        className="lg:hidden vintage-button bg-primary text-primary-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Nav items - Hidden on mobile */}
      <nav className="hidden lg:flex items-center justify-center gap-3 flex-1 pl-0 pt-0 pb-0 -mt-8 relative">
        <div className="absolute left-0">
          <Link
            to="/"
            className={`relative flex items-center gap-2 py-2 px-3 mx-1 transition-all duration-300 whitespace-nowrap rounded-lg ${
              location.pathname === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            }`}
            title="Overview"
          >
            <Coins className="w-5 h-5" />
            <span className="flex items-end gap-0.5">
              <span className="font-serif text-lg font-bold tracking-tight text-foreground leading-none">Pay</span>
              <span className="font-script text-xl text-primary lowercase leading-none transform translate-y-0.5">roll</span>
            </span>
          </Link>
        </div>

        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex items-center gap-2 py-2 px-4 mx-1 text-[0.7rem] sm:text-[0.75rem] font-medium tracking-[0.15em] transition-all duration-300 whitespace-nowrap lowercase ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side items */}
      <div className="flex items-center gap-2 pr-4 ml-auto">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-slate-100 text-muted-foreground hover:text-primary transition-colors"
          title="Cài đặt giao diện & Dữ liệu"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
