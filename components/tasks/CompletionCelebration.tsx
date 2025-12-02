// components/tasks/CompletionCelebration.tsx
import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';

interface CompletionCelebrationProps {
  show: boolean;
  taskTitle: string;
  priority: number;
}

interface ConfettiParticle {
  id: number;
  left: number;
  delay: number;
  color: string;
}

export default function CompletionCelebration({ show, taskTitle, priority }: CompletionCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (!show) return;

    playCompletionSound(priority);

    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      color: randomColor()
    }));

    setConfetti(particles);
  }, [show, priority]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      
      {/* CONFETTI */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 w-3 h-3 animate-confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            backgroundColor: p.color
          }}
        />
      ))}

      {/* CARD */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
        <div className="text-center text-white">
          <div className="mb-4 flex justify-center">
            <Award className="w-20 h-20 animate-bounce" />
          </div>

          <h2 className="text-3xl font-bold mb-2 animate-pulse">Dobra robota!</h2>
          <p className="text-lg opacity-90">{taskTitle}</p>
        </div>
      </div>
    </div>
  );
}

function randomColor() {
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Sound generation function
// Sound generation function
function playCompletionSound(priority: number) {
  if (typeof window === 'undefined' || !window.AudioContext) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    // Rewarding notes depending on priority (higher priority = brighter chord)
    const notes = priority === 1 
      ? [523.25, 659.25, 783.99] // C major
      : priority === 2
      ? [440, 554.37, 659.25]    // A major
      : [392, 493.88, 587.33];   // G major

    const duration = 0.6; // longer for a pleasing decay
    const gainValue = 0.25;

    notes.forEach((frequency, index) => {
      // Create two oscillators for a richer sound
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Slightly detuned for warmth
      osc1.frequency.value = frequency;
      osc2.frequency.value = frequency * 1.01; // +1% detune
      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Connect and shape gain
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Quick attack, smooth decay
      const startTime = now + index * 0.08; // stagger slightly for arpeggio feel
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.02); // attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // decay

      // Start/stop
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    });
  } catch (error) {
    console.log('Audio not supported', error);
  }
}
