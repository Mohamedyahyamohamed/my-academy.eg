/**
 * Service layer barrel — the single source of truth for all data access.
 * UI components and server actions import from here only.
 */
export * from "./session";
export * as StudentsService from "./students";
export * as GroupsService from "./groups";
export * as LessonsService from "./lessons";
export * as AttendanceService from "./attendance";
export * as PaymentsService from "./payments";
export * as GradesService from "./grades";
export * as HomeworkService from "./homework";
export * as DashboardService from "./dashboard";
export * as LifecycleAnalyticsService from "./lifecycle-analytics";
export * as NotificationsService from "./notifications";
export * from "./portals";
export * as MiscService from "./misc";
