// components/TaskIcons.tsx
import { useState } from "react";
import {
  Pill,
  Bath,
  Dumbbell,
  Users,
  Briefcase,
  Home,
  Leaf,
  BookOpen,
  Languages,
} from "lucide-react";

export default function TaskIcons() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const items = [
    { key: "pills", Icon: Pill },
    { key: "bath", Icon: Bath },
    { key: "workout", Icon: Dumbbell },
    { key: "friends", Icon: Users },
    { key: "work", Icon: Briefcase },
    { key: "housework", Icon: Home },
    { key: "plants", Icon: Leaf },
    { key: "duolingo", Icon: Languages },
  ];

  return (
    <div className="grid grid-cols-8 gap-2 mb-4">
      {items.map(({ key, Icon }) => (
        <button
          key={key}
          title={key}
          onClick={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
          className={`p-2 sm:p-4 border rounded text-center ${
            done[key] ? "bg-green-200" : ""
          }`}
        >
          <Icon className="w-5 h-5 sm:w-8 sm:h-8 mx-auto" />
        </button>
      ))}
    </div>
  );
}
