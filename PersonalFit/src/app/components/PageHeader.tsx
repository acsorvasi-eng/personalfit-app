/**
 * PageHeader — Re-export of universal header (Design System Rule 1).
 * All pages use the shared component; legacy props (icon, gradient*) are ignored.
 */

import { LucideIcon } from "lucide-react";
import {
  PageHeader as SharedPageHeader,
  type PageHeaderProps as SharedProps,
  type PageHeaderStatItem as SharedStatItem,
} from "../shared/components/PageHeader";

export type PageHeaderStatItem = SharedStatItem & { bgClass?: string };

export interface PageHeaderProps extends Omit<SharedProps, "stats"> {
  icon?: LucideIcon;
  iconElement?: React.ReactNode;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  action?: React.ReactNode;
  stats?: PageHeaderStatItem[];
  roundedBottom?: boolean;
}

export function PageHeader(props: PageHeaderProps) {
  const { icon, iconElement, gradientFrom, gradientVia, gradientTo, roundedBottom, stats, action, ...rest } = props;
  return <SharedPageHeader {...rest} stats={stats} action={action} />;
}
