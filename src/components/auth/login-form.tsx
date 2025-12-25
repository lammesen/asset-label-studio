import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) {
      setApiError(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="h-6 w-6 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Asset Label Studio</CardTitle>
          <CardDescription>Sign in to your organization account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">
                Organization <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tenantSlug"
                type="text"
                placeholder="your-organization"
                value={formData.tenantSlug}
                onChange={(e) => handleInputChange("tenantSlug", e.target.value)}
                className={cn(errors.tenantSlug && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="organization"
                aria-invalid={Boolean(errors.tenantSlug)}
                aria-describedby={errors.tenantSlug ? "tenantSlug-error" : undefined}
              />
              {errors.tenantSlug && (
                <p id="tenantSlug-error" className="text-sm text-red-500">{errors.tenantSlug}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <p id="email-error" className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={cn(errors.password && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
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
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Contact your administrator if you need access
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
