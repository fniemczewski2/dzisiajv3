// components/tasks/CompletionCelebration.tsx
import { useEffect, useState } from 'react';
import { Sparkles, Star, Award, TrendingUp } from 'lucide-react';

interface CompletionCelebrationProps {
  show: boolean;
  taskTitle: string;
  priority: number;
  streakCount?: number;
  onClose: () => void;
}

export default function CompletionCelebration({
  show,
  taskTitle,
  priority,
  streakCount = 0,
  onClose,
}: CompletionCelebrationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // Play completion sound
      playCompletionSound(priority);

      // Generate confetti particles
      const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
      }));
      setConfetti(particles);

      // Auto-close after animation
      const timer = setTimeout(() => {
        onClose();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, priority, onClose]);

  if (!show) return null;

  const getMessage = () => {
    if (priority === 1) return "🔥 Crushed it!";
    if (priority === 2) return "💪 Great work!";
    if (priority === 3) return "✨ Well done!";
    return "👍 Nice job!";
  };

  const getColor = () => {
    if (priority === 1) return "from-red-500 to-orange-500";
    if (priority === 2) return "from-orange-500 to-yellow-500";
    if (priority === 3) return "from-yellow-500 to-green-500";
    return "from-green-500 to-emerald-500";
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
        {/* Confetti */}
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute top-0 w-3 h-3 animate-confetti"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][
                Math.floor(Math.random() * 6)
              ],
            }}
          />
        ))}

        {/* Celebration Card */}
        <div className={`bg-gradient-to-br ${getColor()} p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn`}>
          <div className="text-center text-white">
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <Award className="w-20 h-20 animate-bounce" />
                <Sparkles className="w-8 h-8 absolute -top-2 -right-2 animate-spin" />
              </div>
            </div>

            {/* Message */}
            <h2 className="text-3xl font-bold mb-2 animate-pulse">{getMessage()}</h2>
            
            {/* Task Title */}
            <p className="text-lg mb-4 opacity-90 line-clamp-2">
              {taskTitle}
            </p>

            {/* Streak Info */}
            {streakCount > 0 && (
              <div className="bg-white/20 rounded-lg p-3 mb-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg font-semibold">
                    {streakCount} day streak! 🔥
                  </span>
                </div>
              </div>
            )}

            {/* Points */}
            <div className="flex items-center justify-center gap-2 text-xl font-bold">
              <Star className="w-6 h-6 fill-current" />
              <span>+{10 + (6 - priority) * 5} points</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}

// Sound generation function
function playCompletionSound(priority: number) {
  if (typeof window === 'undefined' || !window.AudioContext) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different sounds for different priorities
    const notes = priority === 1 
      ? [523.25, 659.25, 783.99] // High priority - C, E, G (major chord)
      : priority === 2
      ? [440, 554.37, 659.25] // Medium-high - A, C#, E
      : [392, 493.88, 587.33]; // Lower priority - G, B, D

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const startTime = audioContext.currentTime + index * 0.1;
      const duration = 0.2;

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.log('Audio not supported');
  }
}