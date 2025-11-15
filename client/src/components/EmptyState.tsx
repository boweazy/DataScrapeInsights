import { ReactNode } from 'react';
import { Database, FileText, Search, Inbox, AlertCircle, Zap, Download, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon with glow effect */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#FFD700]/20 blur-3xl rounded-full"></div>
        <div className="relative bg-[#0D0D0D]/90 border-2 border-[#FFD700]/30 rounded-full p-6">
          <div className="text-[#FFD700]">{icon}</div>
        </div>
      </div>

      {/* Text */}
      <h3 className="text-2xl font-bold text-[#F5F5DC] mb-2">{title}</h3>
      <p className="text-[#F5F5DC]/60 mb-8 max-w-md">{description}</p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              className="bg-[#FFD700] text-[#0D0D0D] hover:bg-[#E6C200] font-semibold px-6"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoScrapersState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Database className="w-12 h-12" />}
      title="No Scrapers Yet"
      description="Create your first web scraper to start collecting data from any website automatically."
      action={{
        label: "Create Scraper",
        onClick: onCreate,
      }}
      secondaryAction={{
        label: "View Examples",
        onClick: () => console.log('View examples'),
      }}
    />
  );
}

export function NoQueriesState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="w-12 h-12" />}
      title="No Queries Saved"
      description="Save your favorite queries for quick access. Run natural language queries and save them here."
      action={{
        label: "Create Query",
        onClick: onCreate,
      }}
    />
  );
}

export function NoSearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="w-12 h-12" />}
      title="No Results Found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
    />
  );
}

export function NoDataState() {
  return (
    <EmptyState
      icon={<Inbox className="w-12 h-12" />}
      title="No Data Available"
      description="There's no data to display yet. Start by creating a scraper or importing data."
    />
  );
}

export function NoExportsState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Download className="w-12 h-12" />}
      title="No Exports Yet"
      description="Export your query results to CSV, JSON, or Excel format for external analysis."
      action={{
        label: "Create Export",
        onClick: onCreate,
      }}
    />
  );
}

export function NoActivitiesState() {
  return (
    <EmptyState
      icon={<Clock className="w-12 h-12" />}
      title="No Recent Activity"
      description="Your recent activities will appear here. Start by running a scraper or query."
    />
  );
}

export function ErrorState({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-12 h-12" />}
      title="Something Went Wrong"
      description={error || "We encountered an error. Please try again."}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

export function ComingSoonState({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={<Zap className="w-12 h-12" />}
      title={`${feature} Coming Soon`}
      description="We're working hard to bring you this feature. Stay tuned for updates!"
    />
  );
}
