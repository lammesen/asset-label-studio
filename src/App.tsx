import { useState } from "react";

import { AssetForm } from "@/components/assets/asset-form";
import { AssetList } from "@/components/assets/asset-list";
import { LoginForm } from "@/components/auth/login-form";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { LabelDesigner } from "@/components/labels/label-designer";
import { TemplateCreateDialog, type TemplateConfig } from "@/components/templates/template-create-dialog";
import { TemplateLibrary } from "@/components/templates/template-library";
import { UserManagement } from "@/components/users/user-management";
import { useAuth } from "@/hooks/use-auth";
import { useTemplates } from "@/hooks/use-templates";
import type { Asset, EquipmentCategory } from "@/types/asset";
import type { LabelSpec, LabelFormatId } from "@/types/label-spec";
import { LABEL_FORMATS } from "@/types/label-spec";
import type { LabelTemplate } from "@/types/template";

import "./index.css";

type TabType = "assets" | "templates" | "users" | "settings";

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

export function App() {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const { createTemplate, updateTemplate, isLoading: isSavingTemplate } = useTemplates();
  const [activeTab, setActiveTab] = useState<TabType>("assets");
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetListKey, setAssetListKey] = useState(0);
  const [showDesigner, setShowDesigner] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);
  const [designerSpec, setDesignerSpec] = useState<LabelSpec | null>(null);
  const [newTemplateFormat, setNewTemplateFormat] = useState<LabelFormatId>("avery-5160");
  const [newTemplateCategory, setNewTemplateCategory] = useState<EquipmentCategory | null>(null);
  const [templateListKey, setTemplateListKey] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  function handleCreateAsset() {
    setEditingAsset(null);
    setIsAssetFormOpen(true);
  }

  function handleEditAsset(asset: Asset) {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  }

  function handleAssetFormSuccess() {
    setAssetListKey((prev) => prev + 1);
  }

  function handleTabChange(tab: TabType) {
    if (tab === "users" && !hasPermission("user:manage")) {
      return;
    }
    if (tab === "templates" && !hasPermission("template:read")) {
      return;
    }
    setShowDesigner(false);
    setEditingTemplate(null);
    setDesignerSpec(null);
    setActiveTab(tab);
  }

  function handleCreateTemplate() {
    setShowCreateDialog(true);
  }

  function handleCreateDialogConfirm(config: TemplateConfig) {
    const spec = createDefaultSpec(config.format);
    spec.name = config.name;
    setEditingTemplate(null);
    setDesignerSpec(spec);
    setNewTemplateFormat(config.format);
    setNewTemplateCategory(config.category);
    setShowCreateDialog(false);
    setShowDesigner(true);
  }

  function handleEditTemplate(template: LabelTemplate) {
    setEditingTemplate(template);
    setDesignerSpec(template.spec);
    setShowDesigner(true);
  }

  function handleCancelDesigner() {
    setShowDesigner(false);
    setEditingTemplate(null);
    setDesignerSpec(null);
  }

  async function handleSaveTemplate() {
    if (!designerSpec) return;

    if (editingTemplate) {
      const updated = await updateTemplate(editingTemplate.id, {
        name: designerSpec.name,
        spec: designerSpec,
      });
      if (updated) {
        setShowDesigner(false);
        setEditingTemplate(null);
        setDesignerSpec(null);
        setTemplateListKey((prev) => prev + 1);
      }
    } else {
      const created = await createTemplate({
        name: designerSpec.name,
        format: newTemplateFormat,
        category: newTemplateCategory ?? undefined,
        spec: designerSpec,
      });
      if (created) {
        setShowDesigner(false);
        setDesignerSpec(null);
        setNewTemplateFormat("avery-5160");
        setNewTemplateCategory(null);
        setTemplateListKey((prev) => prev + 1);
      }
    }
  }

  function renderContent() {
    switch (activeTab) {
      case "assets":
        return (
          <AssetList
            key={assetListKey}
            onCreateAsset={handleCreateAsset}
            onEditAsset={handleEditAsset}
          />
        );
      case "templates":
        if (!hasPermission("template:read")) {
          return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm text-gray-500">You don&apos;t have permission to view templates.</p>
            </div>
          );
        }
        if (showDesigner && designerSpec) {
          return (
            <div className="h-[calc(100vh-8rem)]">
              <LabelDesigner
                spec={designerSpec}
                onSpecChange={setDesignerSpec}
                onSave={handleSaveTemplate}
                onCancel={handleCancelDesigner}
                isSaving={isSavingTemplate}
              />
            </div>
          );
        }
        return (
          <TemplateLibrary
            key={templateListKey}
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
          />
        );
      case "users":
        if (!hasPermission("user:manage")) {
          return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm text-gray-500">You don't have permission to manage users.</p>
            </div>
          );
        }
        return <UserManagement />;
      case "settings":
        return (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
            <p className="text-gray-500">Settings page coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {renderContent()}
      </DashboardLayout>

      <AssetForm
        asset={editingAsset}
        open={isAssetFormOpen}
        onOpenChange={setIsAssetFormOpen}
        onSuccess={handleAssetFormSuccess}
      />

      <TemplateCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTemplate={handleCreateDialogConfirm}
      />
    </>
  );
}

export default App;
