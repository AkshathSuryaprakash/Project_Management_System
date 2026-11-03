import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "./ui/separator";
import { Link, useLocation } from "react-router-dom";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Search } from "lucide-react";
import { SearchDialog } from "./search/search-dialog";
import { NotificationDropdown } from "./notifications/notification-dropdown";
import { ThemeToggle } from "./theme-toggle";

const Header = () => {
  const location = useLocation();
  const workspaceId = useWorkspaceId();
  const [searchOpen, setSearchOpen] = useState(false);

  const pathname = location.pathname;

  const getPageLabel = (path: string) => {
    if (path.includes("/project/")) return "Project";
    if (path.includes("/settings")) return "Settings";
    if (path.includes("/tasks")) return "Tasks";
    if (path.includes("/kanban")) return "Kanban Board";
    if (path.includes("/calendar")) return "Calendar";
    if (path.includes("/messages")) return "Messages";
    if (path.includes("/activity")) return "Activity Log";
    if (path.includes("/reports")) return "Reports";
    if (path.includes("/members")) return "Members";
    return null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pageHeading = getPageLabel(pathname);

  return (
    <header className="flex sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block text-[15px]">
              {pageHeading ? (
                <BreadcrumbLink asChild>
                  <Link to={`/workspace/${workspaceId}`}>Dashboard</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="line-clamp-1">
                  Dashboard
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>

            {pageHeading && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="text-[15px]">
                  <BreadcrumbPage className="line-clamp-1">
                    {pageHeading}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        {/* Workspace Search box with Ctrl+K */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border rounded-md transition-colors w-44 md:w-60 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5" />
            <span>Search workspace...</span>
          </div>
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        {/* Notifications Bell */}
        <NotificationDropdown />

        {/* Dark/Light mode toggle */}
        <ThemeToggle />
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;
