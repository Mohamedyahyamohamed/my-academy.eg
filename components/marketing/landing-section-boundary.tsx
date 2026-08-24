"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface LandingSectionBoundaryProps {
  children: ReactNode;
  label: string;
}

interface LandingSectionBoundaryState {
  hasError: boolean;
}

export class LandingSectionBoundary extends Component<LandingSectionBoundaryProps, LandingSectionBoundaryState> {
  state: LandingSectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LandingSectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[landing-section:${this.props.label}] render failed`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section aria-label={this.props.label} className="border-y border-border/60 bg-muted/20 px-4 py-12 text-center sm:py-16">
          <p className="text-sm font-semibold text-muted-foreground">{this.props.label}</p>
          <p className="mt-2 text-sm text-muted-foreground">المحتوى غير متاح مؤقتًا. جرّب تحديث الصفحة بعد لحظات.</p>
        </section>
      );
    }

    return this.props.children;
  }
}
