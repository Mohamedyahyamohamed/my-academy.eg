import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/shared/breadcrumb";
import { BackButton } from "@/components/shared/back-button";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
  showBack?: boolean;
}

/**
 * Unified page header used across every page — title, description,
 * breadcrumbs, and a primary action slot.
 */
export function PageHeader({
  title,
  description,
  children,
  breadcrumbs,
  className,
  showBack = true,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  <BreadcrumbItem>
                    {b.href && i < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink href={b.href}>{b.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{b.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {(showBack || children) && (
        <div className="flex flex-wrap items-center gap-2">
          {showBack && <BackButton />}
          {children}
        </div>
      )}
    </div>
  );
}
