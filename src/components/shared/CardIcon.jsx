import { Building2, ClipboardList, Euro, Calculator, Minus, FileText, Car, Receipt, Mail, Folder, Tag, User, Divide, Handshake, Package, BarChart3, Link2, Repeat, Settings, AlertTriangle } from "lucide-react";

// v306 (V28) — kaart-iconen als vaste lijn-iconen i.p.v. emoji: emoji zien er per apparaat anders
// uit (en op sommige systemen kleurrijk-kinderachtig naast de rustige kaartstijl). Eén plek, zodat
// alle kaarten (SectionCard/RollupCard) dezelfde stijl houden. Gebruik: <CardIcon name="car" />.
const MAP = {
  building: Building2, list: ClipboardList, euro: Euro, calc: Calculator, minus: Minus, doc: FileText,
  car: Car, receipt: Receipt, mail: Mail, folder: Folder, tag: Tag, user: User, divide: Divide,
  handshake: Handshake, package: Package, chart: BarChart3, link: Link2, repeat: Repeat,
  settings: Settings, warning: AlertTriangle,
};

export default function CardIcon({ name, className = "h-3.5 w-3.5 text-slate-700" }) {
  const Icon = MAP[name] || FileText;
  return <Icon className={className} aria-hidden="true" />;
}
