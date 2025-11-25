import {
  ArrowDownToLine,
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  Infinity,
  ListChecks,
  Map,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import type { ComponentType } from "react";
import type { IconName } from "@/lib/marketing/content";

const iconMap: Record<IconName, ComponentType<{ className?: string }>> = {
  ArrowDownToLine,
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  Infinity,
  ListChecks,
  Map,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
};

type MarketingIconProps = {
  name: IconName;
  className?: string;
};

export function MarketingIcon({ name, className }: MarketingIconProps) {
  const Icon = iconMap[name];
  return <Icon className={className} aria-hidden="true" />;
}
