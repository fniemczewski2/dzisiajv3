import { useState } from 'react';
import { PillIcon, BathtubIcon, LightningBoltIcon, UserGroupIcon, BriefcaseIcon, HomeIcon, SparklesIcon, BookOpenIcon } from '@heroicons/react/solid';

const icons = [
  { id: 'pills', Icon: PillIcon },
  { id: 'bath', Icon: BathtubIcon },
  { id: 'workout', Icon: LightningBoltIcon },
  { id: 'friends', Icon: UserGroupIcon },
  { id: 'work', Icon: BriefcaseIcon },
  { id: 'housework', Icon: HomeIcon },
  { id: 'plants', Icon: SparklesIcon },
  { id: 'duolingo', Icon: BookOpenIcon }
];

export default function TaskIcons() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {icons.map(({ id, Icon }) => (
        <div key={id} onClick={() => setDone({ ...done, [id]: !done[id] })}
             className={`p-4 border rounded text-center ${done[id] ? 'bg-green-200' : ''}`}>
          <Icon className="w-8 h-8 mx-auto" />
          <span className="block mt-1 text-xs">{id}</span>
        </>
    ))
  );
}