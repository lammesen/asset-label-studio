import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { 
  Box, 
  FileText, 
  Users, 
  Settings, 
  Menu, 
  LogOut, 
  Printer, 
  ChevronDown,
  ChevronsLeft,
  Search,
  Bell
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Permission } from "@/types/permissions";
import { Input } from "@/components/ui/input";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/assets",
    label: "Assets",
    icon: Box,
  },
  {
    path: "/templates",
    label: "Templates",
    icon: FileText,
    permission: "template:read",
  },
  {
    path: "/users",
    label: "Users",
    icon: Users,
    permission: "user:manage",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

const PATH_TITLES: Record<string, string> = {
  "/assets": "Asset Management",
  "/templates": "Label Templates",
  "/templates/new": "Create Template",
  "/users": "User Management",
  "/settings": "System Settings",
};

function getPageTitle(pathname: string): string {
  if (pathname.includes("/templates/") && pathname.includes("/edit")) {
    return "Edit Template";
  }
  return PATH_TITLES[pathname] || "Asset Label Studio";
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentPath = location.pathname;

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function isActiveRoute(path: string): boolean {
    if (path === "/templates") {
      return currentPath === "/templates" || currentPath.startsWith("/templates/");
    }
    return currentPath === path || currentPath.startsWith(path + "/");
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen flex bg-background">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[70px]" : "w-64"
        )}
      >
        <div className={cn("h-16 flex items-center border-b border-sidebar-border", isCollapsed ? "justify-center px-0" : "px-6 gap-3")}>
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 shadow-sm shadow-sidebar-primary/20">
            <Printer className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="font-bold text-sm tracking-tight text-sidebar-foreground">Asset Label Studio</h1>
            </div>
          )}
        </div>

        <div className="flex-1 py-4 px-3 overflow-y-auto">
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4.5 w-4.5 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
                  {!isCollapsed && (
                    <span className="animate-in fade-in slide-in-from-left-2 duration-200">{item.label}</span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary opacity-0 lg:opacity-100" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="flex items-center justify-between">
             {!isCollapsed && <p className="text-xs font-medium text-sidebar-foreground/40">ACCOUNT</p>}
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-auto hidden lg:flex text-sidebar-foreground/40 hover:text-sidebar-foreground"
                onClick={() => setIsCollapsed(!isCollapsed)}
             >
                <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
             </Button>
          </div>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-auto py-2",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Avatar className="h-8 w-8 border border-sidebar-border rounded-lg">
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs rounded-lg">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                        <p className="text-sm font-medium truncate leading-none mb-1">{user.name}</p>
                        <p className="text-xs text-sidebar-foreground/60 truncate leading-none">{user.email}</p>
                      </div>
                    )}
                    {!isCollapsed && <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 ml-auto" />}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56" side={isCollapsed ? "right" : "top"} sideOffset={12}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-muted/20 transition-all duration-300",
        isCollapsed ? "lg:ml-[70px]" : "lg:ml-64"
      )}>
        <header className="bg-background/80 border-b border-border sticky top-0 z-30 h-16 flex items-center px-6 justify-between backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden -ml-2 text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">{getPageTitle(currentPath)}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search..." 
                className="pl-9 h-9 w-[200px] lg:w-[300px] bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all" 
              />
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
