import { useState, useEffect } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2, FileX } from "lucide-react";

import { queryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoginForm } from "@/components/auth/login-form";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AssetList } from "@/components/assets/asset-list";
import { AssetForm } from "@/components/assets/asset-form";
import { ImportWizard } from "@/components/assets/import-wizard";
import { TemplateLibrary } from "@/components/templates/template-library";
import { TemplateCreateDialog } from "@/components/templates/template-create-dialog";
import { UserManagement } from "@/components/users/user-management";
import { SettingsPage } from "@/components/settings/settings-page";
import { AccessDenied } from "@/components/ui/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { LabelDesignerBoundary } from "@/components/labels/label-designer-boundary";
import { useAuth } from "@/hooks/use-auth";
import { useTemplates } from "@/hooks/use-templates";
import type { Asset, EquipmentCategory } from "@/types/asset";
import type { LabelSpec, LabelFormatId } from "@/types/label-spec";
import { LABEL_FORMATS } from "@/types/label-spec";
import type { LabelTemplate } from "@/types/template";

import "./index.css";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
          <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

function createDefaultSpec(format: LabelFormatId): LabelSpec {
  const formatConfig = LABEL_FORMATS[format];
  return {
    id: crypto.randomUUID(),
    version: "1.0.0",
    name: "New Template",
    dimensions: { ...formatConfig.dimensions },
    dpi: 300,
    margins: { top: 2, right: 2, bottom: 2, left: 2 },
    fields: [],
    elements: [],
  };
}

const rootRoute = createRootRoute({
  component: function RootLayout() {
    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </QueryClientProvider>
    );
  },
});

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/assets" });
    }
  }, [isLoading, isAuthenticated, navigate]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated) {
    return <LoadingSpinner />;
  }
  
  return <LoginForm />;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }
  
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_layout",
  component: AuthenticatedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/assets" });
  },
});

function AssetsPage() {
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  function handleCreateAsset() {
    setEditingAsset(null);
    setIsAssetFormOpen(true);
  }

  function handleEditAsset(asset: Asset) {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  }

  function handleImportAssets() {
    setIsImportWizardOpen(true);
  }

  return (
    <>
      <AssetList
        onCreateAsset={handleCreateAsset}
        onEditAsset={handleEditAsset}
        onImportAssets={handleImportAssets}
      />
      <AssetForm
        asset={editingAsset}
        open={isAssetFormOpen}
        onOpenChange={setIsAssetFormOpen}
        onSuccess={() => {}}
      />
      <ImportWizard
        open={isImportWizardOpen}
        onOpenChange={setIsImportWizardOpen}
        onSuccess={() => {}}
      />
    </>
  );
}

const assetsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/assets",
  component: AssetsPage,
});

function TemplatesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!hasPermission("template:read")) {
    return (
      <AccessDenied
        title="Templates Restricted"
        message="You don't have permission to view or manage label templates."
      />
    );
  }

  function handleCreateTemplate() {
    setShowCreateDialog(true);
  }

  function handleEditTemplate(template: LabelTemplate) {
    navigate({ to: "/templates/$templateId/edit", params: { templateId: template.id } });
  }

  function handleCreateDialogConfirm(config: { name: string; format: LabelFormatId; category: EquipmentCategory | null }) {
    setShowCreateDialog(false);
    navigate({ 
      to: "/templates/new", 
      search: { 
        name: config.name, 
        format: config.format, 
        category: config.category ?? undefined 
      } 
    });
  }

  return (
    <>
      <TemplateLibrary
        onCreateTemplate={handleCreateTemplate}
        onEditTemplate={handleEditTemplate}
      />
      <TemplateCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTemplate={handleCreateDialogConfirm}
      />
    </>
  );
}

const templatesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/templates",
  component: TemplatesPage,
});

function TemplateNewPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { createTemplate, isLoading: isSavingTemplate, invalidateTemplates } = useTemplates();
  
  const [designerSpec, setDesignerSpec] = useState<LabelSpec | null>(null);
  const [format, setFormat] = useState<LabelFormatId>("avery-5160");
  const [category, setCategory] = useState<EquipmentCategory | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get("name") || "New Template";
    const formatParam = (params.get("format") as LabelFormatId) || "avery-5160";
    const categoryParam = params.get("category") as EquipmentCategory | undefined;
    
    setFormat(formatParam);
    setCategory(categoryParam || undefined);
    
    const spec = createDefaultSpec(formatParam);
    spec.name = nameParam;
    setDesignerSpec(spec);
  }, []);

  if (!hasPermission("template:write")) {
    return (
      <AccessDenied
        title="Create Template Restricted"
        message="You don't have permission to create label templates."
      />
    );
  }

  async function handleSave() {
    if (!designerSpec) return;

    const created = await createTemplate({
      name: designerSpec.name,
      format,
      category,
      spec: designerSpec,
    });
    
    if (created) {
      invalidateTemplates();
      navigate({ to: "/templates" });
    }
  }

  function handleCancel() {
    navigate({ to: "/templates" });
  }

  if (!designerSpec) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in duration-300">
      <LabelDesignerBoundary
        spec={designerSpec}
        onSpecChange={setDesignerSpec}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSavingTemplate}
      />
    </div>
  );
}

const templateNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/templates/new",
  component: TemplateNewPage,
});

function TemplateEditPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { updateTemplate, isLoading: isSavingTemplate, invalidateTemplates } = useTemplates();
  
  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [designerSpec, setDesignerSpec] = useState<LabelSpec | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const templateId = pathParts[pathParts.indexOf("templates") + 1];
    
    async function loadTemplate() {
      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setTemplate(data.template);
          setDesignerSpec(data.template.spec);
        }
      } finally {
        setIsLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, []);

  if (!hasPermission("template:write")) {
    return (
      <AccessDenied
        title="Edit Template Restricted"
        message="You don't have permission to edit label templates."
      />
    );
  }

  if (isLoadingTemplate) {
    return <LoadingSpinner />;
  }

  if (!template || !designerSpec) {
    return (
      <PageShell>
        <EmptyState
          icon={FileX}
          title="Template Not Found"
          description="The template you're looking for doesn't exist or has been deleted."
        />
      </PageShell>
    );
  }

  async function handleSave() {
    if (!designerSpec || !template) return;

    const updated = await updateTemplate(template.id, {
      name: designerSpec.name,
      spec: designerSpec,
    });
    
    if (updated) {
      invalidateTemplates();
      navigate({ to: "/templates" });
    }
  }

  function handleCancel() {
    navigate({ to: "/templates" });
  }

  return (
    <div className="h-[calc(100vh-8rem)] rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in duration-300">
      <LabelDesignerBoundary
        spec={designerSpec}
        onSpecChange={setDesignerSpec}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSavingTemplate}
      />
    </div>
  );
}

const templateEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/templates/$templateId/edit",
  component: TemplateEditPage,
});

function UsersPage() {
  const { hasPermission } = useAuth();

  if (!hasPermission("user:manage")) {
    return (
      <AccessDenied
        title="User Management Restricted"
        message="You don't have permission to manage users."
      />
    );
  }

  return <UserManagement />;
}

const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/users",
  component: UsersPage,
});



const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    indexRoute,
    assetsRoute,
    templatesRoute,
    templateNewRoute,
    templateEditRoute,
    usersRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
