import { useState } from "react";
import { Loader2, Printer, Building2, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface FormData {
  tenantSlug: string;
  email: string;
  password: string;
}

interface FormErrors {
  tenantSlug?: string;
  email?: string;
  password?: string;
}

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    tenantSlug: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.tenantSlug.trim()) {
      newErrors.tenantSlug = "Organization slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.tenantSlug)) {
      newErrors.tenantSlug = "Only lowercase letters, numbers, and hyphens allowed";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    const result = await login({
      tenantSlug: formData.tenantSlug.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });

    if (!result.success) {
      setApiError(result.error ?? "Login failed. Please try again.");
    }
  }

  function handleInputChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) {
      setApiError(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="w-full max-w-md p-4 z-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
            <Printer className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Asset Label Studio
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Enterprise asset management and label printing system
          </p>
        </div>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your organization details to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {apiError && (
                <div role="alert" className="flex items-start gap-3 p-3 text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{apiError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Organization ID</Label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="tenantSlug"
                    type="text"
                    placeholder="acme-inc"
                    value={formData.tenantSlug}
                    onChange={(e) => handleInputChange("tenantSlug", e.target.value)}
                    className={cn("pl-9 transition-shadow focus:ring-primary/20", errors.tenantSlug && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                    autoComplete="organization"
                  />
                </div>
                {errors.tenantSlug && (
                  <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">{errors.tenantSlug}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={cn("pl-9 transition-shadow focus:ring-primary/20", errors.email && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={cn("pl-9 transition-shadow focus:ring-primary/20", errors.password && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="w-full text-center text-xs text-muted-foreground">
              Need access? Contact your system administrator.
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2025 Asset Label Studio. Secure Enterprise Access.
        </p>
      </div>
    </div>
  );
}
