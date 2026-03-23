import { useAuth } from '../providers/AuthProvider';

export default function LoginForm() {
  const { supabase } = useAuth();
  
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card p-6 rounded-xl shadow text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4">Dzisiaj v3</h1>
        <p className="mb-6">Zaloguj się, aby skorzystać z&nbsp;aplikacji</p>
        <button
          onClick={handleGoogleLogin}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          Zaloguj przez Google
        </button>
      </div>
    </div>
  );
}