import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  FileDigit,
  FileDown,
  GraduationCap,
  HeartHandshake,
  Infinity,
  ListCheck,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { ComponentType } from "react";
import type { IconName } from "@/lib/marketing/content";

const iconMap: Record<IconName, ComponentType<{ className?: string }>> = {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  FileDigit,
  FileDown,
  GraduationCap,
  HeartHandshake,
  Infinity,
  ListCheck,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
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
